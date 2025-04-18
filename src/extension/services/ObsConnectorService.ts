import type NodeCG from '@nodecg/types';
import {
    Configschema,
    ObsConfig,
    ObsConnectionInfo,
    ObsState,
    ObsVideoInputAssignments,
    ObsVideoInputPositions,
    VideoInputAssignment
} from 'types/schemas';
import { EventTypes, OBSWebSocketError, OBSWebSocket, OBSResponseTypes } from 'obs-websocket-js';
import { isBlank } from 'shared/StringHelper';
import cloneDeep from 'lodash/cloneDeep';
import { ObsSceneItem, ObsSceneItemTransform } from 'types/obs';
import { HasNodecgLogger } from '../helpers/HasNodecgLogger';
import { JsonObject } from 'type-fest';

// Authentication failed, Unsupported protocol version, Session invalidated
const SOCKET_CLOSURE_CODES_FORBIDDING_RECONNECTION = [4009, 4010, 4011];
// Checked from OBS's source - Under each source's 'obs_source_info' struct, the output_flags property defines if a
// source outputs video or not. The websocket doesn't expose these details by itself...
const OBS_INPUT_KINDS_WITHOUT_VIDEO = [
    'sck_audio_capture',
    'coreaudio_input_capture',
    'coreaudio_output_capture',
    'oss_input_capture',
    'pulse_input_capture',
    'pulse_output_capture',
    'alsa_input_capture',
    'jack_output_capture',
    'audio_line',
    'sndio_output_capture'
];

export type ObsAudioMonitorType = 'OBS_MONITORING_TYPE_NONE' | 'OBS_MONITORING_TYPE_MONITOR_ONLY' | 'OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT';

export class ObsConnectorService extends HasNodecgLogger {
    private readonly nodecg: NodeCG.ServerAPI;
    private readonly socket: OBSWebSocket;
    private readonly sceneDataInTransitionEvents: boolean;
    private obsConnectionInfo: NodeCG.ServerReplicantWithSchemaDefault<ObsConnectionInfo>;
    private obsVideoInputAssignments: NodeCG.ServerReplicantWithSchemaDefault<ObsVideoInputAssignments>;
    private obsVideoInputPositions: NodeCG.ServerReplicantWithSchemaDefault<ObsVideoInputPositions>;
    private reconnectionInterval: NodeJS.Timeout | null = null;
    private reconnectionCount: number;
    private programSceneChangeListeners: ((sceneName: string) => void)[]
    readonly obsConfig: NodeCG.ServerReplicantWithSchemaDefault<ObsConfig>;
    readonly obsState: NodeCG.ServerReplicantWithSchemaDefault<ObsState>;

    constructor(nodecg: NodeCG.ServerAPI<Configschema>) {
        super(nodecg);
        this.nodecg = nodecg;
        this.obsState = nodecg.Replicant('obsState') as unknown as NodeCG.ServerReplicantWithSchemaDefault<ObsState>;
        this.obsConnectionInfo = nodecg.Replicant('obsConnectionInfo') as unknown as NodeCG.ServerReplicantWithSchemaDefault<ObsConnectionInfo>;
        this.obsConfig = nodecg.Replicant('obsConfig') as unknown as NodeCG.ServerReplicantWithSchemaDefault<ObsConfig>;
        this.obsVideoInputAssignments = nodecg.Replicant('obsVideoInputAssignments') as unknown as NodeCG.ServerReplicantWithSchemaDefault<ObsVideoInputAssignments>;
        this.obsVideoInputPositions = nodecg.Replicant('obsVideoInputPositions') as unknown as NodeCG.ServerReplicantWithSchemaDefault<ObsVideoInputPositions>;
        this.socket = new OBSWebSocket();
        this.reconnectionCount = 0;
        this.sceneDataInTransitionEvents = nodecg.bundleConfig.obs?.sceneDataInTransitionEvents ?? false;
        this.programSceneChangeListeners = [];

        this.obsState.value.status = 'NOT_CONNECTED';
        this.obsState.value.transitionInProgress = false;

        this.socket
            .on('ConnectionClosed', e => this.handleClosure(e))
            .on('ConnectionOpened', () => this.handleOpening())
            .on('Identified', () => {
                this.handleIdentification().catch(e => {
                    this.logError('Error loading OBS data', e);
                });
            })
            .on('CurrentProgramSceneChanged', e => this.handleProgramSceneChange(e))
            .on('CurrentPreviewSceneChanged', e => this.handlePreviewSceneChange(e))
            .on('StudioModeStateChanged', e => this.handleStudioModeStatechange(e))
            .on('CurrentSceneCollectionChanged', this.handleSceneCollectionChange.bind(this))
            .on('SceneTransitionStarted', this.handleSceneTransitionStart.bind(this));

        if (this.obsState.value.enabled) {
            this.connect().catch(e => {
                this.logError('Error while connecting to OBS', e);
            });
        }
    }

    addProgramSceneChangeListener(callback: (sceneName: string) => void) {
        this.programSceneChangeListeners.push(callback);
    }

    private callProgramSceneChangeListeners(sceneName: string) {
        this.programSceneChangeListeners.forEach(callback => {
            try {
                callback(sceneName);
            } catch (e) {
                this.logError('Error calling program scene change callback', e);
            }
        });
    }

    private handleClosure(event: EventTypes['ConnectionClosed']): void {
        if (this.obsState.value.status === 'CONNECTED') {
            if (event.code !== 1000) {
                this.logger.error(`OBS websocket closed with message: ${event.message}`);
            }
            this.obsState.value.status = 'NOT_CONNECTED';
            if (this.obsState.value.enabled) {
                this.startReconnecting(event.code);
            }
        }

        this.socket
            .off('SceneCreated')
            .off('SceneRemoved')
            .off('SceneNameChanged')
            .off('InputCreated')
            .off('InputRemoved')
            .off('InputNameChanged')
            .off('RecordStateChanged');
    }

    private async handleIdentification(): Promise<void> {
        const sceneCollections = await this.socket.call('GetSceneCollectionList');
        await this.loadState(sceneCollections.currentSceneCollectionName);
        await Promise.all(this.obsVideoInputAssignments.value.map((assignments, i) => this.setGameLayoutVideoFeedPositions(assignments, i)));

        this.socket
            .on('SceneCreated', this.handleSceneCreation.bind(this))
            .on('SceneRemoved', this.handleSceneRemoval.bind(this))
            .on('SceneNameChanged', this.handleSceneNameChange.bind(this))
            .on('SceneItemCreated', this.handleSceneItemCreation.bind(this))
            .on('SceneItemRemoved', this.handleSceneItemRemoval.bind(this))
            .on('InputNameChanged', this.handleInputNameChange.bind(this))
            .on('RecordStateChanged', this.handleRecordStateChange.bind(this));
    }

    private handleSceneCollectionChange(event: EventTypes['CurrentSceneCollectionChanged']): void {
        this.loadState(event.sceneCollectionName).catch(e => {
            this.logError('Error loading OBS data after scene collection change', e);
        });
    }

    private async loadState(currentSceneCollection: string): Promise<void> {
        const scenes = await this.getScenes();
        const videoInputs = await this.getVideoInputs();
        const recordStatus = await this.socket.call('GetRecordStatus');

        this.callProgramSceneChangeListeners(scenes.currentScene);

        this.obsState.value = {
            ...this.obsState.value,
            scenes: scenes.scenes,
            currentScene: scenes.currentScene,
            previewScene: scenes.previewScene,
            currentSceneCollection,
            videoInputs,
            status: 'CONNECTED',
            recording: recordStatus.outputActive
        };
    }

    async getVideoSettings(): Promise<OBSResponseTypes['GetVideoSettings']> {
        return this.socket.call('GetVideoSettings');
    }

    private handleOpening(): void {
        this.logger.info('OBS websocket is open.');
        this.obsState.value.transitionInProgress = false;
        this.stopReconnecting();
    }

    async getSourceScreenshot(sourceName: string): Promise<string> {
        return (await this.socket.call('GetSourceScreenshot', { sourceName, imageFormat: 'png' })).imageData;
    }

    async getSceneItemTransform(sceneItemId: number, sceneName?: string): Promise<ObsSceneItemTransform> {
        return (await this.socket.call('GetSceneItemTransform', { sceneName, sceneItemId })).sceneItemTransform as ObsSceneItemTransform;
    }

    async setSceneItemCrop(sceneName: string, sceneItemId: number, crop: { cropTop: number, cropRight: number, cropBottom: number, cropLeft: number }) {
        await this.socket.call('SetSceneItemTransform', {
            sceneName,
            sceneItemId,
            sceneItemTransform: crop
        });
    }

    private async handleSceneItemCreation(event: EventTypes['SceneItemCreated']) {
        if (event.sceneName === this.obsConfig.value.videoInputsScene) {
            // This event doesn't give us enough info about the created item, so we just reload the list
            this.obsState.value.videoInputs = await this.getVideoInputs();
        }
    }

    private handleSceneItemRemoval(event: EventTypes['SceneItemRemoved']) {
        if (event.sceneName === this.obsConfig.value.videoInputsScene && this.obsState.value.videoInputs != null) {
            this.obsState.value.videoInputs = this.obsState.value.videoInputs.filter(input => input.sourceName !== event.sourceName);
        }
    }

    private handleInputNameChange(event: EventTypes['InputNameChanged']) {
        if (this.obsState.value.videoInputs != null) {
            this.obsState.value.videoInputs = this.obsState.value.videoInputs.map(input => ({ ...input, sourceName: event.oldInputName === input.sourceName ? event.inputName : input.sourceName }));
        }
        this.obsVideoInputAssignments.value = this.obsVideoInputAssignments.value.map(feedAssignment => ({
            gameCaptures: feedAssignment.gameCaptures.map(assignment =>
                assignment?.sourceName === event.oldInputName ? { ...assignment, sourceName: event.inputName } : assignment),
            cameraCaptures: feedAssignment.cameraCaptures.map(assignment =>
                assignment?.sourceName === event.oldInputName ? { ...assignment, sourceName: event.inputName } : assignment)
        })) as ObsVideoInputAssignments;
    }

    private async getVideoInputs(): Promise<ObsState['videoInputs']> {
        const videoInputsScene = this.obsConfig.value.videoInputsScene;
        if (videoInputsScene == null) return [];
        try {
            const inputs = await this.socket.call('GetSceneItemList', { sceneName: videoInputsScene });
            return inputs.sceneItems
                .filter(sceneItem => sceneItem.sourceType === 'OBS_SOURCE_TYPE_SCENE' || typeof sceneItem.inputKind === 'string' && !OBS_INPUT_KINDS_WITHOUT_VIDEO.includes(sceneItem.inputKind))
                .map(sceneItem => ({
                    type: String(sceneItem.inputKind),
                    sourceName: String(sceneItem.sourceName),
                    sourceUuid: typeof sceneItem.sourceUuid === 'string' ? sceneItem.sourceUuid : null
                }));
        } catch (e) {
            this.logger.debug('Failed to get video inputs from OBS:', e);
            return [];
        }
    }

    async createInput(sceneName: string, inputName: string, inputKind: string, inputSettings: JsonObject): Promise<OBSResponseTypes['CreateInput']> {
        return this.socket.call('CreateInput', {
            sceneName,
            inputName,
            inputKind,
            // @ts-ignore: TypeScript doesn't like this, even if it is correct.
            inputSettings
        });
    }

    async setInputSettings(inputName: string, inputSettings: JsonObject): Promise<void> {
        return this.socket.call('SetInputSettings', {
            inputName,
            // @ts-ignore: TypeScript doesn't like this, even if it is correct.
            inputSettings
        });
    }

    async setInputAudioMonitorType(inputName: string, monitorType: ObsAudioMonitorType): Promise<void> {
        return this.socket.call('SetInputAudioMonitorType', { inputName, monitorType })
    }

    async removeInput(inputName: string): Promise<void> {
        return this.socket.call('RemoveInput', { inputName });
    }

    async getMediaInputStatus(inputName: string): Promise<OBSResponseTypes['GetMediaInputStatus']> {
        return this.socket.call('GetMediaInputStatus', { inputName });
    }

    async removeSceneItem(sceneName: string, sceneItemId: number): Promise<void> {
        await this.socket.call('RemoveSceneItem', { sceneName, sceneItemId });
    }

    async setSceneItemIndex(sceneName: string, sceneItemId: number, sceneItemIndex: number): Promise<void> {
        await this.socket.call('SetSceneItemIndex', { sceneName, sceneItemId, sceneItemIndex });
    }

    async getSceneItemList(sceneName: string): Promise<ObsSceneItem[]> {
        const sceneItemListResponse = await this.socket.call('GetSceneItemList', { sceneName });
        return sceneItemListResponse.sceneItems as ObsSceneItem[];
    }

    async setSceneItemTransform(sceneName: string, sceneItemId: number, sceneItemTransform: JsonObject): Promise<void> {
        return this.socket.call('SetSceneItemTransform', {
            sceneName,
            sceneItemId,
            // @ts-ignore: TypeScript doesn't like this, even if it is correct.
            sceneItemTransform
        });
    }

    async setGameLayoutVideoFeedAssignments(type: 'game' | 'camera', assignments: (VideoInputAssignment | null)[], feedIndex: number) {
        const newInputAssignments = cloneDeep(this.obsVideoInputAssignments.value[feedIndex]);
        newInputAssignments[type === 'game' ? 'gameCaptures' : 'cameraCaptures'] = assignments;
        await this.setGameLayoutVideoFeedPositions(newInputAssignments, feedIndex);
    }

    async setGameLayoutVideoFeedPositions(videoInputAssignments: ObsVideoInputAssignments[number], feedIndex: number) {
        const videoInputsScene = this.obsConfig.value.gameLayoutVideoFeedScenes[feedIndex];
        if (videoInputsScene == null || this.obsState.value.status !== 'CONNECTED') return;

        const unusedSceneItems = await this.getSceneItemList(videoInputsScene);

        const cameraCaptureSceneItemIds = await this.assignCameraCaptures('camera', videoInputAssignments, unusedSceneItems, feedIndex);
        const gameCaptureSceneItemIds = await this.assignCameraCaptures('game', videoInputAssignments, unusedSceneItems, feedIndex);

        const newInputAssignments = cloneDeep(videoInputAssignments);
        cameraCaptureSceneItemIds.forEach((sceneItemId, i) => {
            const existingAssignment = newInputAssignments.cameraCaptures[i];
            if (existingAssignment != null) {
                existingAssignment.sceneItemId = sceneItemId;
            }
        });
        gameCaptureSceneItemIds.forEach((sceneItemId, i) => {
            const existingAssignment = newInputAssignments.gameCaptures[i];
            if (existingAssignment != null) {
                existingAssignment.sceneItemId = sceneItemId;
            }
        });
        this.obsVideoInputAssignments.value[feedIndex] = newInputAssignments;

        this.logger.debug(`Removing ${unusedSceneItems.length} unused scene items`);
        for (const unusedSceneItem of unusedSceneItems) {
            await this.socket.call('RemoveSceneItem', {
                sceneName: videoInputsScene,
                sceneItemId: unusedSceneItem.sceneItemId
            });
        }
    }

    private async assignCameraCaptures(type: 'game' | 'camera', inputAssignments: ObsVideoInputAssignments[number], unusedSceneItems: ObsSceneItem[], feedIndex: number): Promise<(number | undefined)[]> {
        const videoInputsScene = this.obsConfig.value.gameLayoutVideoFeedScenes[feedIndex];
        if (videoInputsScene == null) return [];
        const typeAssignments = inputAssignments[type === 'game' ? 'gameCaptures' : 'cameraCaptures'];
        const allAssignments = [
            ...inputAssignments.gameCaptures,
            ...inputAssignments.cameraCaptures
        ];
        const capturePositions = type === 'camera'
            ? this.obsVideoInputPositions.value[feedIndex].cameraCaptures
            : this.obsVideoInputPositions.value[feedIndex].gameCaptures;
        const boundsType = type === 'camera' ? 'OBS_BOUNDS_SCALE_OUTER' : 'OBS_BOUNDS_STRETCH';
        const sceneItemIds: (number | undefined)[] = [];

        this.logger.debug(`Assigning ${capturePositions.length} ${type} capture(s)`);
        for (let i = 0; i < capturePositions.length; i++) {
            const capture = capturePositions[i];
            const assignedFeed = typeAssignments[i] ?? null;
            if (assignedFeed == null || !this.obsState.value.videoInputs?.some(input => input.sourceName === assignedFeed?.sourceName)) {
                this.logger.debug(`${type} ${i + 1} - Assigned input is missing`);
                sceneItemIds.push(undefined);
                continue;
            }

            let sceneItemIndex: number = -1;
            if (assignedFeed.sceneItemId != null) {
                sceneItemIndex = unusedSceneItems.findIndex(sceneItem =>
                    sceneItem.sourceName === assignedFeed.sourceName
                    && sceneItem.sceneItemId === assignedFeed.sceneItemId);
            }
            if (sceneItemIndex === -1) {
                sceneItemIndex = unusedSceneItems.findIndex(sceneItem =>
                    !allAssignments.some(assignment => assignment?.sceneItemId === sceneItem.sceneItemId)
                    && sceneItem.sourceName === assignedFeed?.sourceName);
            }

            if (sceneItemIndex !== -1) {
                const existingSceneItem = unusedSceneItems[sceneItemIndex];
                this.logger.debug(`${type} ${i + 1} - Found existing scene item`);
                if (
                    existingSceneItem.sceneItemTransform.boundsType !== boundsType
                    || existingSceneItem.sceneItemTransform.boundsHeight !== capture.height
                    || existingSceneItem.sceneItemTransform.boundsWidth !== capture.width
                    || !existingSceneItem.sceneItemTransform.cropToBounds
                    || existingSceneItem.sceneItemTransform.positionX !== capture.x
                    || existingSceneItem.sceneItemTransform.positionY !== capture.y
                ) {
                    this.logger.debug(`${type} ${i + 1} - Correcting transform settings`);
                    await this.socket.call('SetSceneItemTransform', {
                        sceneName: videoInputsScene,
                        sceneItemId: existingSceneItem.sceneItemId,
                        sceneItemTransform: {
                            boundsType,
                            boundsHeight: capture.height,
                            boundsWidth: capture.width,
                            positionX: capture.x,
                            positionY: capture.y,
                            cropToBounds: true
                        }
                    });
                }
                unusedSceneItems.splice(sceneItemIndex, 1);
                sceneItemIds.push(existingSceneItem.sceneItemId);
            } else {
                this.logger.debug(`${type} ${i + 1} - Creating scene item for assigned input`);
                const newSceneItem = await this.socket.call('CreateSceneItem', {
                    sceneName: videoInputsScene,
                    sourceName: assignedFeed.sourceName,
                    sceneItemEnabled: false
                });
                await this.socket.call('SetSceneItemTransform', {
                    sceneName: videoInputsScene,
                    sceneItemId: newSceneItem.sceneItemId,
                    sceneItemTransform: {
                        boundsType,
                        boundsHeight: capture.height,
                        boundsWidth: capture.width,
                        positionX: capture.x,
                        positionY: capture.y,
                        cropToBounds: true
                    }
                });
                await this.socket.call('SetSceneItemEnabled', {
                    sceneName: videoInputsScene,
                    sceneItemId: newSceneItem.sceneItemId,
                    sceneItemEnabled: true
                });
                sceneItemIds.push(newSceneItem.sceneItemId);
            }
        }

        return sceneItemIds;
    }

    // region Scenes
    private handleSceneCreation(event: EventTypes['SceneCreated']): void {
        if (event.isGroup) return;

        if (this.obsState.value.scenes == null) {
            this.obsState.value.scenes = [event.sceneName];
        } else {
            this.obsState.value.scenes.push(event.sceneName);
        }
    }

    private handleSceneRemoval(event: EventTypes['SceneRemoved']): void {
        if (!event.isGroup && this.obsState.value.scenes != null) {
            this.obsState.value.scenes = this.obsState.value.scenes.filter(scene => scene !== event.sceneName);
        }
    }

    private handleSceneNameChange(event: EventTypes['SceneNameChanged']): void {
        if (this.obsState.value.scenes != null) {
            this.obsState.value.scenes = this.obsState.value.scenes.map(scene =>
                scene === event.oldSceneName ? event.sceneName : scene);
        }

        const configUpdates: Partial<ObsConfig> = {};
        (['videoInputsScene', 'gameplayScene', 'intermissionScene'] as (keyof ObsConfig)[]).forEach(configKey => {
            if (this.obsConfig.value[configKey] === event.oldSceneName) {
                (configUpdates[configKey] as string) = event.sceneName;
            }
        });
        configUpdates.gameLayoutVideoFeedScenes = this.obsConfig.value.gameLayoutVideoFeedScenes.map(scene => {
            if (scene != null && scene === event.oldSceneName) {
                return event.sceneName;
            }

            return scene;
        });
        if (Object.keys(configUpdates).length > 0) {
            this.obsConfig.value = {
                ...this.obsConfig.value,
                ...configUpdates
            };
        }
    }

    private handleSceneTransitionStart(event: EventTypes['SceneTransitionStarted']): void {
        this.obsState.value.transitionInProgress = true;
        // We can use a slightly modified build of obs-websocket to know when the program scene changes when the transition
        // begins instead of when it ends.
        if (this.sceneDataInTransitionEvents) {
            this.callProgramSceneChangeListeners((event as unknown as { toScene: string }).toScene);
        }
    }

    private handleProgramSceneChange(event: EventTypes['CurrentProgramSceneChanged']): void {
        this.obsState.value.currentScene = event.sceneName;
        this.obsState.value.transitionInProgress = false;
        if (!this.sceneDataInTransitionEvents) {
            this.callProgramSceneChangeListeners(event.sceneName);
        }
    }

    private handlePreviewSceneChange(event: EventTypes['CurrentPreviewSceneChanged']): void {
        this.obsState.value.previewScene = event.sceneName;
    }

    private handleStudioModeStatechange(event: EventTypes['StudioModeStateChanged']): void {
        this.obsState.value.previewScene = event.studioModeEnabled ? this.obsState.value.currentScene : null;
    }

    private async getScenes(): Promise<{ currentScene: string, previewScene: string | null, scenes: string[] }> {
        const sceneList = await this.socket.call('GetSceneList');
        const scenes = sceneList.scenes.map(scene => String(scene.sceneName));

        return {
            currentScene: sceneList.currentProgramSceneName,
            previewScene: sceneList.currentPreviewSceneName,
            scenes
        };
    }

    setCurrentScene(scene: string): Promise<void> {
        if (!this.obsState.value.transitionInProgress) {
            return this.socket.call('SetCurrentProgramScene', { sceneName: scene });
        } else {
            return Promise.reject(new Error('Another transition is still in progress.'));
        }
    }

    async waitForSceneSwitch(): Promise<string> {
        return new Promise(resolve => {
            this.socket.once('CurrentProgramSceneChanged', event => {
                resolve(event.sceneName);
            });
        });
    }
    // endregion

    async connect(reconnectOnFailure = true): Promise<void> {
        await this.socket.disconnect();
        this.obsState.value.status = 'CONNECTING';

        const address = this.obsConnectionInfo.value.address.indexOf('://') === -1
            ? `ws://${this.obsConnectionInfo.value.address}`
            : this.obsConnectionInfo.value.address;
        try {
            await this.socket.connect(
                address,
                isBlank(this.obsConnectionInfo.value.password) ? undefined : this.obsConnectionInfo.value.password);
        } catch (e) {
            this.obsState.value.status = 'NOT_CONNECTED';
            if (reconnectOnFailure) {
                this.startReconnecting(e instanceof OBSWebSocketError ? e.code : undefined);
            }
            throw new Error(`Failed to connect to OBS: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    async disconnect(): Promise<void> {
        this.stopReconnecting();
        await this.socket.disconnect();
    }

    startReconnecting(socketClosureCode?: number): void {
        if (socketClosureCode != null && SOCKET_CLOSURE_CODES_FORBIDDING_RECONNECTION.includes(socketClosureCode)) return;

        this.stopReconnecting();
        this.reconnectionInterval = setInterval(() => {
            this.reconnectionCount++;
            if (this.reconnectionCount === 1) {
                this.logger.info('Attempting to reconnect to OBS...');
            }
            this.connect(false).catch(() => {
                // ignore
            });
        }, 10000);
    }

    stopReconnecting(): void {
        if (this.reconnectionInterval) {
            clearInterval(this.reconnectionInterval);
        }
        this.reconnectionInterval = null;
        this.reconnectionCount = 0;
    }

    async setConfig(newValue: ObsConfig): Promise<void> {
        this.obsConfig.value = newValue;
        this.obsState.value.videoInputs = await this.getVideoInputs();
    }

    isGameplayScene(sceneName: string): boolean {
        return this.obsConfig.value.gameplayScenes.filter(Boolean).some(gameplaySceneName => sceneName === gameplaySceneName);
    }

    gameplaySceneInProgram(): boolean {
        return this.obsState.value.status !== 'NOT_CONNECTED'
            && this.obsState.value.currentScene != null
            && this.isGameplayScene(this.obsState.value.currentScene);
    }

    private handleRecordStateChange(event: EventTypes['RecordStateChanged']) {
        this.obsState.value.recording = event.outputActive;
    }

    async startRecording() {
        return this.socket.call('StartRecord');
    }

    async stopRecording() {
        return this.socket.call('StopRecord');
    }

    static sceneNameTagPresent(tag: string, sceneName: string): boolean {
        return new RegExp(`\\[.*${tag}.*]$`).test(sceneName);
    }
}
