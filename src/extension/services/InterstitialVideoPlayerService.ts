import type NodeCG from '@nodecg/types';
import { Configschema, VideoFile } from 'types/schemas';
import { ObsConnectorService } from './ObsConnectorService';
import { JsonObject } from 'type-fest';
import { HasNodecgLogger } from '../helpers/HasNodecgLogger';
import { InterstitialVideoState } from 'types/schemas/interstitialVideoState';

const TIME_REMAINING_BEFORE_INTERSTITIAL_VIDEO_STOP_MILLIS = 1500;

export class InterstitialVideoPlayerService extends HasNodecgLogger {
    private readonly interstitialVideoState: NodeCG.ServerReplicantWithSchemaDefault<InterstitialVideoState>;
    private readonly obsConnectorService: ObsConnectorService;
    private readonly mediaSourceName: string;
    private mediaSourceUpdateInterval: NodeJS.Timeout | undefined;
    private playlistPlayTimeout: NodeJS.Timeout | undefined;

    constructor(
        nodecg: NodeCG.ServerAPI<Configschema>,
        obsConnectorService: ObsConnectorService
    ) {
        super(nodecg);

        this.interstitialVideoState = nodecg.Replicant('interstitialVideoState') as unknown as NodeCG.ServerReplicantWithSchemaDefault<InterstitialVideoState>;
        this.obsConnectorService = obsConnectorService;
        this.mediaSourceName = `${nodecg.bundleName} - Interstitial Video`;
        this.mediaSourceUpdateInterval = undefined;
        this.playlistPlayTimeout = undefined;

        this.interstitialVideoState.value.isRunning = false;
    }

    async play(file: VideoFile, returnToScene: InterstitialVideoState['returnToScene']) {
        clearTimeout(this.playlistPlayTimeout);

        const interstitialVideoScene = this.obsConnectorService.obsConfig.value.interstitialVideoScene;
        if (interstitialVideoScene == null) {
            throw new Error('Interstitial video scene must be configured to continue');
        }
        if (returnToScene === 'INTERMISSION' && this.obsConnectorService.obsConfig.value.intermissionScene == null) {
            throw new Error('Intermission scene must be configured to continue');
        } else if (returnToScene === 'PREVIEW' && this.obsConnectorService.obsState.value.previewScene == null) {
            throw new Error('OBS must be set to Studio Mode to continue');
        }

        this.interstitialVideoState.value = {
            isRunning: true,
            returnToScene
        };
        await this.configurePlaylistMediaSource(interstitialVideoScene, file.path);
        this.logger.debug('Configured media source');

        return new Promise<void>((resolve, reject) => {
            this.playlistPlayTimeout = setTimeout(() => {
                this.logger.debug('Interstitial video launching!');

                this.setMediaSourceUpdateInterval();
                this.obsConnectorService.setCurrentScene(interstitialVideoScene).then(resolve).catch(reject);
            }, 1000);
        });
    }

    private setMediaSourceUpdateInterval() {
        this.mediaSourceUpdateInterval = setInterval(() => {
            if (this.obsConnectorService.obsState.value.status !== 'CONNECTED') {
                this.logger.warn('OBS is not connected; skipping media source update');
                return;
            }

            this.obsConnectorService.getMediaInputStatus(this.mediaSourceName)
                .then(result => {
                    if (result.mediaState !== 'OBS_MEDIA_STATE_PLAYING' || !this.interstitialVideoState.value.isRunning) {
                        clearInterval(this.mediaSourceUpdateInterval);
                        this.interstitialVideoState.value.isRunning = false;
                        return;
                    }

                    if (result.mediaCursor > result.mediaDuration - TIME_REMAINING_BEFORE_INTERSTITIAL_VIDEO_STOP_MILLIS) {
                        this.logger.debug('Interstitial video is done');
                        clearInterval(this.mediaSourceUpdateInterval);
                        this.onVideoEnd()
                            .catch(e => {
                                this.logError('Failed to handle interstitial video end', e);
                            });
                    }
                })
                .catch(e => {
                    this.logError('Failed to update playlist media source status', e);
                });
        }, 1000);
    }

    private async onVideoEnd() {
        this.interstitialVideoState.value.isRunning = false;

        const nextScene = this.interstitialVideoState.value.returnToScene === 'INTERMISSION'
            ? this.obsConnectorService.obsConfig.value.intermissionScene
            : this.obsConnectorService.obsState.value.previewScene;
        if (nextScene == null) {
            throw new Error('Failed to determine next scene to switch to');
        }
        await this.obsConnectorService.setCurrentScene(nextScene);
    }

    private async configurePlaylistMediaSource(sceneName: string, videoFilePath: string) {
        const interstitialVideoSceneItems = await this.obsConnectorService.getSceneItemList(sceneName);

        const existingMediaSource = interstitialVideoSceneItems.find(sceneItem => sceneItem.sourceName === this.mediaSourceName);
        if (existingMediaSource == null) {
            await this.createPlaylistMediaSource(sceneName, videoFilePath);
        } else if (existingMediaSource.inputKind !== 'ffmpeg_source') {
            // What is this...?
            this.logger.debug('Recreating existing playlist media source');
            await this.obsConnectorService.removeSceneItem(sceneName, existingMediaSource.sceneItemId);
            await this.createPlaylistMediaSource(sceneName, videoFilePath);
        } else {
            // If the source already exists, we'll assume it's positioned correctly. You wouldn't mess with that, would you?
            await this.obsConnectorService.setInputSettings(this.mediaSourceName, this.getPlaylistMediaSourceSettings(videoFilePath));
        }
    }

    private async createPlaylistMediaSource(sceneName: string, videoFilePath: string) {
        const videoSettings = await this.obsConnectorService.getVideoSettings();
        const newInput = await this.obsConnectorService.createInput(sceneName, this.mediaSourceName, 'ffmpeg_source', this.getPlaylistMediaSourceSettings(videoFilePath));
        await this.obsConnectorService.setSceneItemTransform(sceneName, newInput.sceneItemId, {
            boundsType: 'OBS_BOUNDS_SCALE_INNER',
            boundsHeight: videoSettings.baseHeight,
            boundsWidth: videoSettings.baseWidth,
            positionX: 0,
            positionY: 0,
            cropToBounds: true
        });
        // This is required for our audio setup. The monitoring output from OBS is routed into our audio mixer,
        // from where we read the audio levels to display on stream and optionally route the video's audio to
        // the house speakers.
        await this.obsConnectorService.setInputAudioMonitorType(this.mediaSourceName, 'OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT');
    }

    private getPlaylistMediaSourceSettings(videoFilePath: string): JsonObject {
        return {
            local_file: videoFilePath,
            hw_decode: true,
            looping: false,
            clear_on_media_end: true,
            restart_on_activate: true
        };
    }
}
