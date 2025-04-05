import type NodeCG from '@nodecg/types';
import { Configschema, ObsState, SpeedrunPlaylistState } from 'types/schemas';
import { ObsConnectorService } from './ObsConnectorService';
import { ObsSceneItem } from 'types/obs';
import { JsonObject } from 'type-fest';
import { SpeedrunService } from './SpeedrunService';
import { TimerService } from './TimerService';
import { Duration } from 'luxon';
import { DiscordWebhookClient } from '../clients/DiscordWebhookClient';
import { HasDiscordWebhookLogger } from '../helpers/HasDiscordWebhookLogger';

const DELAY_BETWEEN_PLAYLIST_ITEMS_MILLIS = 20000;
const TIME_REMAINING_BEFORE_PLAYLIST_ITEM_STOP_MILLIS = 1500;

export class SpeedrunPlaylistService extends HasDiscordWebhookLogger {
    private readonly speedrunPlaylistState: NodeCG.ServerReplicantWithSchemaDefault<SpeedrunPlaylistState>;
    private readonly obsConnectorService: ObsConnectorService;
    private readonly speedrunService: SpeedrunService;
    private readonly timerService: TimerService;
    private readonly playlistMediaSourceName: string;
    private playlistMediaSourceUpdateInterval: NodeJS.Timeout | undefined;
    private playlistPlayTimeout: NodeJS.Timeout | undefined;
    private playlistRecordingTimeout: NodeJS.Timeout | undefined;
    private activeSpeedrunTimerStartTimeMillis: number | undefined;
    private activeSpeedrunTimerStopTimeMillis: number | undefined;
    private speedrunPlaylistCyclesRecording: boolean;

    constructor(
        nodecg: NodeCG.ServerAPI<Configschema>,
        obsConnectorService: ObsConnectorService,
        speedrunService: SpeedrunService,
        timerService: TimerService,
        discordWebhookClient: DiscordWebhookClient | null
    ) {
        super(nodecg, discordWebhookClient);

        this.speedrunPlaylistState = nodecg.Replicant('speedrunPlaylistState') as unknown as NodeCG.ServerReplicantWithSchemaDefault<SpeedrunPlaylistState>;
        this.obsConnectorService = obsConnectorService;
        this.speedrunService = speedrunService;
        this.timerService = timerService;
        this.playlistMediaSourceName = `${nodecg.bundleName} - Speedrun Playlist`;
        this.playlistMediaSourceUpdateInterval = undefined;
        this.playlistPlayTimeout = undefined;
        this.playlistRecordingTimeout = undefined;
        this.activeSpeedrunTimerStartTimeMillis = undefined;
        this.activeSpeedrunTimerStopTimeMillis = undefined;
        this.speedrunPlaylistCyclesRecording = nodecg.bundleConfig.videos?.speedrunPlaylistCyclesRecording ?? false;

        this.setObsConnectionReporter();

        this.speedrunService.activeSpeedrun.on('change', newValue => {
            if (newValue?.videoFile == null) {
                this.activeSpeedrunTimerStartTimeMillis = undefined;
                this.activeSpeedrunTimerStopTimeMillis = undefined;
            } else {
                this.activeSpeedrunTimerStartTimeMillis = Duration.fromISO(newValue.videoFile.timerStartTime).shiftTo('milliseconds').milliseconds;
                this.activeSpeedrunTimerStopTimeMillis = Duration.fromISO(newValue.videoFile.timerStopTime).shiftTo('milliseconds').milliseconds;
            }
        });

        // Attempt to recover when a playlist was running the last time we exited
        if (this.obsConnectorService.obsState.value.enabled && this.speedrunPlaylistState.value.isRunning) {
            this.logger.info('Speedrun playlist was previously left running - Attempting to recover...');

            const playlistStateResetTimeout = setTimeout(() => {
                this.logger.warn('OBS connection was not restored within 20 seconds; bailing out');
                this.obsConnectorService.obsState.off('change', obsStateWatcher);
                this.speedrunPlaylistState.value.isRunning = false;
            }, 20000);

            const obsStateWatcher = (newValue: ObsState) => {
                const cleanupWatchers = () => {
                    clearTimeout(playlistStateResetTimeout);
                    this.obsConnectorService.obsState.off('change', obsStateWatcher);
                };

                if (!this.speedrunPlaylistState.value.isRunning) {
                    // Theoretically, the playlist may be manually stopped before we ever reach this spot.
                    cleanupWatchers();
                } else if (newValue.status === 'CONNECTED' || !newValue.enabled) {
                    cleanupWatchers();

                    if (newValue.enabled) {
                        const gameplayScene = this.obsConnectorService.obsConfig.value.gameplayScenes[0];
                        if (gameplayScene != null && newValue.currentScene === gameplayScene) {
                            this.resumeAfterLaunch()
                                .catch(e => {
                                    this.logError('Unhandled error when recovering speedrun playlist', e);
                                });
                        } else {
                            // We're outside the gameplay scene, or we don't know what the gameplay scene is.
                            // It's forbidden to start a playlist without knowing the gameplay scene, anyways.
                            // NodeCG falling over while we're mid-playlist but not actively playing a video
                            // is weird and unlikely. It won't be cataclysmic if I don't handle it.
                            if (gameplayScene == null) {
                                this.logger.warn('Gameplay scene is unknown; bailing out');
                            } else {
                                this.logger.warn('Not in gameplay scene; bailing out');
                            }
                            this.speedrunPlaylistState.value.isRunning = false;
                        }
                    } else {
                        this.speedrunPlaylistState.value.isRunning = false;
                    }
                }
            };

            this.obsConnectorService.obsState.on('change', obsStateWatcher);
        } else {
            this.speedrunPlaylistState.value.isRunning = false;
        }
    }

    async resumeAfterLaunch() {
        try {
            const mediaInputStatus = await this.obsConnectorService.getMediaInputStatus(this.playlistMediaSourceName);

            switch (mediaInputStatus.mediaState) {
                case 'OBS_MEDIA_STATE_PLAYING':
                    this.logger.info('Found playlist media source, still playing video. Resuming normal operation.');
                    this.setMediaSourceUpdateInterval();
                    break;
                case 'OBS_MEDIA_STATE_ENDED':
                    this.logger.info('Found playlist media source, its video has ended. Swapping over to the next run.');
                    await this.switchToNextSpeedrun();
                    break;
                default:
                    // OBS_MEDIA_STATE_OPENING, OBS_MEDIA_STATE_BUFFERING and OBS_MEDIA_STATE_ERROR
                    // appear to be unused by the regular OBS media source.
                    // (See: obs-studio/plugins/obs-ffmpeg/obs-ffmpeg-source.c)

                    // Besides that, we don't pause or stop the media source at any point ourselves.
                    // If it's in that state, something is off. We bail in those cases as well.
                    this.logger.warn(`Unable to proceed with playlist media source in state "${mediaInputStatus.mediaState.split('_').pop()}"; bailing out`);
                    this.speedrunPlaylistState.value.isRunning = false;
            }
        } catch (e) {
            this.logger.error('Caught an error while recovering speedrun playlist! Bailing to intermission, if possible.');
            const intermissionScene = this.obsConnectorService.obsConfig.value.intermissionScene;
            if (intermissionScene != null && this.obsConnectorService.obsState.value.currentScene !== intermissionScene) {
                this.obsConnectorService.setCurrentScene(intermissionScene).catch(e => {
                    this.logError('Failed to switch to intermission scene', e);
                });
            }
        }
    }

    async play(delay = 2000) {
        clearTimeout(this.playlistPlayTimeout);
        clearTimeout(this.playlistRecordingTimeout);

        if (this.speedrunService.activeSpeedrun.value == null) {
            throw new Error('The active speedrun is unknown.');
        }

        const videoFile = this.speedrunService.activeSpeedrun.value.videoFile;
        if (videoFile == null) {
            throw new Error('The active speedrun has no video file.');
        }

        const mainGameplayScene = this.obsConnectorService.obsConfig.value.gameplayScenes[0];
        if (mainGameplayScene == null) {
            throw new Error('Main feed gameplay scene must be configured to continue');
        }
        if (this.obsConnectorService.obsConfig.value.intermissionScene == null) {
            throw new Error('Intermission scene must be configured to continue');
        }

        this.speedrunPlaylistState.value.isRunning = true;
        await this.configurePlaylistMediaSource(mainGameplayScene, videoFile.path);
        this.logger.debug('Configured playlist media source');

        if (this.speedrunPlaylistCyclesRecording) {
            if (this.obsConnectorService.obsState.value.recording) {
                try {
                    await this.obsConnectorService.stopRecording();
                } catch (e) {
                    this.logError('Failed to stop OBS recording', e);
                }
            }

            this.playlistRecordingTimeout = setTimeout(() => {
                if (!this.obsConnectorService.obsState.value.recording) {
                    this.obsConnectorService.startRecording().catch(e => this.logError('Failed to start OBS recording', e));
                }
            }, delay - 1000);
        }

        return new Promise<void>((resolve, reject) => {
            this.playlistPlayTimeout = setTimeout(() => {
                this.logger.debug('Speedrun playlist launching!');

                this.setMediaSourceUpdateInterval();
                this.obsConnectorService.setCurrentScene(mainGameplayScene).then(resolve).catch(reject);
            }, delay);
        });
    }

    async stop() {
        const intermissionScene = this.obsConnectorService.obsConfig.value.intermissionScene;
        const willSwitchScene = intermissionScene != null && this.obsConnectorService.obsState.value.currentScene !== intermissionScene;
        if (!willSwitchScene) {
            this.speedrunPlaylistState.value.isRunning = false;
        }
        if (this.obsConnectorService.obsState.value.transitionInProgress) {
            throw new Error('Cannot stop playlist while a transition is in progress');
        }

        clearInterval(this.playlistMediaSourceUpdateInterval);
        clearTimeout(this.playlistPlayTimeout);
        clearTimeout(this.playlistRecordingTimeout);

        if (this.timerService.isActive()) {
            this.timerService.stopAll();
        }

        if (intermissionScene == null) {
            throw new Error('The intermission scene is unknown!');
        }
        if (willSwitchScene) {
            await this.obsConnectorService.setCurrentScene(intermissionScene);
            await this.obsConnectorService.waitForSceneSwitch();
            this.speedrunPlaylistState.value.isRunning = false;
        }
        await this.cleanUpPlaylistMediaSource();
    }

    private setMediaSourceUpdateInterval() {
        this.playlistMediaSourceUpdateInterval = setInterval(() => {
            if (this.obsConnectorService.obsState.value.status !== 'CONNECTED') {
                this.logger.warn('OBS is not connected; skipping playlist media source update');
                return;
            }

            this.obsConnectorService.getMediaInputStatus(this.playlistMediaSourceName)
                .then(result => {
                    if (result.mediaState !== 'OBS_MEDIA_STATE_PLAYING') return;

                    if (!this.speedrunPlaylistState.value.isRunning) {
                        clearInterval(this.playlistMediaSourceUpdateInterval);
                        return;
                    }

                    if (
                        this.activeSpeedrunTimerStartTimeMillis != null
                        && result.mediaCursor > this.activeSpeedrunTimerStartTimeMillis
                        && !this.timerService.isFinished()
                        && !this.timerService.isActive()
                    ) {
                        this.timerService.start();
                    }
                    if (
                        this.activeSpeedrunTimerStopTimeMillis != null
                        && result.mediaCursor > this.activeSpeedrunTimerStopTimeMillis
                        && this.timerService.isActive()
                    ) {
                        // todo: doesn't support teams at all; but this next marathon only has solo pre-recorded runs
                        this.timerService.stopAll();
                    }

                    if (result.mediaCursor > result.mediaDuration - TIME_REMAINING_BEFORE_PLAYLIST_ITEM_STOP_MILLIS) {
                        this.logger.debug('This run is done; hopping back to intermission!');
                        clearInterval(this.playlistMediaSourceUpdateInterval);
                        this.switchToNextSpeedrun()
                            .catch(e => {
                                this.logError('Failed to seek to next speedrun in playlist', e);
                            });
                    }
                })
                .catch(e => {
                    this.logError('Failed to update playlist media source status', e);
                });
        }, 1000);
    }

    private async switchToNextSpeedrun() {
        const intermissionScene = this.obsConnectorService.obsConfig.value.intermissionScene;
        if (intermissionScene == null) {
            throw new Error('The intermission scene is unknown!');
        }

        if (this.timerService.isActive()) {
            this.timerService.stopAll();
        }
        await this.obsConnectorService.setCurrentScene(intermissionScene);
        await this.obsConnectorService.waitForSceneSwitch();
        this.speedrunService.seekToNextRun();
        if (this.speedrunService.activeSpeedrun.value?.videoFile != null) {
            await this.play(DELAY_BETWEEN_PLAYLIST_ITEMS_MILLIS);
        } else {
            this.logger.debug('This was the last run in this playlist. Goodbye for now!');
            this.speedrunPlaylistState.value.isRunning = false;
            if (this.speedrunPlaylistCyclesRecording && this.obsConnectorService.obsState.value.recording) {
                try {
                    await this.obsConnectorService.stopRecording();
                } catch (e) {
                    this.logError('Failed to stop OBS recording', e);
                }
            }
            try {
                await this.cleanUpPlaylistMediaSource();
            } catch (e) {
                this.logError('Failed to clean up after playlist end', e);
            }
        }
    }

    private async cleanUpPlaylistMediaSource() {
        return this.obsConnectorService.removeInput(this.playlistMediaSourceName);
    }

    private async configurePlaylistMediaSource(sceneName: string, videoFilePath: string) {
        const mainGameplaySceneItems = await this.obsConnectorService.getSceneItemList(sceneName);

        const existingMediaSource = mainGameplaySceneItems.find(sceneItem => sceneItem.sourceName === this.playlistMediaSourceName);
        if (existingMediaSource == null) {
            await this.createPlaylistMediaSource(sceneName, mainGameplaySceneItems, videoFilePath);
        } else if (existingMediaSource.inputKind !== 'ffmpeg_source') {
            // What is this...?
            this.logger.debug('Recreating existing playlist media source');
            await this.obsConnectorService.removeSceneItem(sceneName, existingMediaSource.sceneItemId);
            await this.createPlaylistMediaSource(sceneName, mainGameplaySceneItems, videoFilePath);
        } else {
            // If the source already exists, we'll assume it's positioned correctly. You wouldn't mess with that, would you?
            await this.obsConnectorService.setInputSettings(this.playlistMediaSourceName, this.getPlaylistMediaSourceSettings(videoFilePath));
        }
    }

    private async createPlaylistMediaSource(sceneName: string, existingSceneItems: ObsSceneItem[], videoFilePath: string) {
        const videoSettings = await this.obsConnectorService.getVideoSettings();
        const newInput = await this.obsConnectorService.createInput(sceneName, this.playlistMediaSourceName, 'ffmpeg_source', this.getPlaylistMediaSourceSettings(videoFilePath));
        await this.obsConnectorService.setSceneItemTransform(sceneName, newInput.sceneItemId, {
            boundsType: 'OBS_BOUNDS_STRETCH',
            boundsHeight: videoSettings.baseHeight,
            boundsWidth: videoSettings.baseWidth,
            positionX: 0,
            positionY: 0,
            cropToBounds: true
        });
        // This is required for our audio setup. The monitoring output from OBS is routed into our audio mixer,
        // from where we read the audio levels to display on stream and optionally route the video's audio to
        // the house speakers.
        await this.obsConnectorService.setInputAudioMonitorType(this.playlistMediaSourceName, 'OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT');

        if (existingSceneItems.length > 0) {
            // sceneItemIndex is read bottom-to-top; the item with the highest sceneItemIndex is displayed on top of all others
            // Attempt to place the source underneath the last browser source
            const sceneItemIndex = Math.min(...existingSceneItems
                .filter(sceneItem => sceneItem.inputKind === 'browser_source')
                .map(sceneItem => sceneItem.sceneItemIndex));
            if (sceneItemIndex !== Infinity) {
                await this.obsConnectorService.setSceneItemIndex(sceneName, newInput.sceneItemId, sceneItemIndex);
            } else {
                this.logger.warn('Unable to guess where media source for speedrun playlist should be placed');
            }
        }
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

    private setObsConnectionReporter() {
        let connectionReportTimeout: NodeJS.Timeout | undefined = undefined;

        this.obsConnectorService.obsState.on('change', (newValue, oldValue) => {
            if (!oldValue || !this.speedrunPlaylistState.value.isRunning || newValue.status === 'CONNECTED') {
                clearTimeout(connectionReportTimeout);
                connectionReportTimeout = undefined;
                return;
            }

            // Wait to see if we reconnect automatically before causing an alert.
            // The OBS connector attempts to reconnect after 10 seconds.
            if (newValue.status === 'NOT_CONNECTED' && oldValue.status === 'CONNECTED' && connectionReportTimeout == null) {
                connectionReportTimeout = setTimeout(() => {
                    this.logError('OBS has disconnected from layouts!', null);
                    connectionReportTimeout = undefined;
                }, 15000);
            }
        });
    }
}
