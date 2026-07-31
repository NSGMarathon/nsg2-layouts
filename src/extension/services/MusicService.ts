import type NodeCG from '@nodecg/types';
import type { Configschema, MusicState } from 'types/schemas';
import axios, { isAxiosError } from 'axios';
import { Readable } from 'stream';
import { ObsConnectorService } from './ObsConnectorService';
import { HasNodecgLogger } from '../helpers/HasNodecgLogger';

type FoobarUpdate = { } | {
    player: {
        activeItem: {
            columns: string[]
        }
    }
}

const FOOBAR_RECONNECTION_TIMEOUT = 5000;

export class MusicService extends HasNodecgLogger {
    private readonly musicState: NodeCG.ServerReplicantWithSchemaDefault<MusicState>;
    private readonly config: Configschema['foobar2000'];
    private readonly authorization: string | undefined = undefined;
    private readonly obsConnectorService: ObsConnectorService;
    private reconnectionTimeout: NodeJS.Timeout | undefined = undefined;

    constructor(nodecg: NodeCG.ServerAPI<Configschema>, obsConnectorService: ObsConnectorService) {
        super(nodecg);
        this.musicState = nodecg.Replicant('musicState') as unknown as NodeCG.ServerReplicantWithSchemaDefault<MusicState>;
        this.config = nodecg.bundleConfig.foobar2000;
        this.obsConnectorService = obsConnectorService;

        if (this.config?.username != null && this.config?.password != null) {
            this.authorization = `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`;
        }

        this.attemptConnection();

        this.obsConnectorService.addProgramSceneChangeListener(sceneName => {
            this.onSceneChange(sceneName);
        });
    }

    async attemptConnection() {
        this.connect().catch(e => {
            const message = e instanceof Error ? e.message : String(e);
            if (message !== 'canceled' && !(isAxiosError(e) && e.code === 'ECONNREFUSED')) {
                this.logger.error('Error while connecting to foobar2000:', message);
            }
            if (this.reconnectionTimeout) {
                clearTimeout(this.reconnectionTimeout);
            }
            this.reconnectionTimeout = setTimeout(() => {
                this.attemptConnection();
            }, FOOBAR_RECONNECTION_TIMEOUT);
        });
    }

    private onSceneChange(sceneName: string) {
        if (ObsConnectorService.sceneNameTagPresent('M', sceneName)) {
            this.play().catch(e => {
                this.logError('Error playing music', e);
            });
        } else {
            this.pause().catch(e => {
                this.logError('Error pausing music', e);
            });
        }
    }

    private async play() {
        if (this.config?.address == null || this.musicState.value.connectionState !== 'CONNECTED') return;
        await axios.post(`${this.config?.address}/api/player/play`, null, {
            headers: {
                Authorization: this.authorization
            }
        });
    }

    private async pause() {
        if (this.config?.address == null || this.musicState.value.connectionState !== 'CONNECTED') return;
        await axios.post(`${this.config?.address}/api/player/pause`, null, {
            headers: {
                Authorization: this.authorization
            }
        });
    }

    private async connect() {
        const baseAddress = this.config?.address;
        if (baseAddress == null) {
            this.logger.warn('Foobar2000 address is not configured. Music info will not be available.');
            this.musicState.value = {
                connectionState: 'DISCONNECTED'
            };
            return;
        }
        this.musicState.value.connectionState = 'CONNECTING';
        // Retry if 5s have passed and no connection has been made
        const abortController = new AbortController();
        setTimeout(() => {
            if (this.musicState.value.connectionState === 'CONNECTING') {
                abortController.abort();
                if (this.reconnectionTimeout) {
                    clearTimeout(this.reconnectionTimeout);
                }
                this.reconnectionTimeout = setTimeout(() => {
                    this.attemptConnection();
                }, FOOBAR_RECONNECTION_TIMEOUT);
                this.musicState.value.track = {
                    artist: undefined,
                    song: undefined
                };
            }
        }, 5000);
        const response = await axios.get<Readable>(`${baseAddress}/api/query/updates?player=true&trcolumns=%artist%,%title%`, {
            responseType: 'stream',
            signal: abortController.signal,
            headers: {
                Authorization: this.authorization
            }
        });
        this.logger.debug('Connected to foobar2000');
        this.musicState.value.connectionState = 'CONNECTED';
        const currentScene = this.obsConnectorService.obsState.value.currentScene;
        if (currentScene?.includes('[M]')) {
            this.onSceneChange(currentScene);
        }
        response.data.on('data', (chunk: Buffer) => {
            try {
                const parsedData = JSON.parse(chunk.toString().slice(6).replace(/(\r\n|\n|\r)/gm, '')) as FoobarUpdate;
                if ('player' in parsedData) {
                    this.musicState.value.track = {
                        artist: parsedData.player.activeItem.columns[0],
                        song: parsedData.player.activeItem.columns[1]
                    }
                }
            } catch (e) {
                this.logError('Error parsing foobar2000 response', e);
            }
        });
        response.data.on('close', () => {
            this.logger.warn('Foobar2000 connection closed');
        });
        response.data.on('error', e => {
            this.logError('Foobar2000 connection error', e);
        });
        response.data.on('end', () => {
            this.musicState.value.connectionState = 'DISCONNECTED';
            this.logger.warn('Foobar2000 connection ended');
            clearTimeout(this.reconnectionTimeout);
            this.reconnectionTimeout = setTimeout(() => {
                this.attemptConnection();
            }, FOOBAR_RECONNECTION_TIMEOUT);
        });
    }
}
