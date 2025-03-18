import EventEmitter from 'events';
import TypedEmitter from 'typed-emitter';
import type NodeCG from '@nodecg/types';
import type { Configschema, TrackerState } from 'types/schemas';
import WebSocket from 'ws';
import { createLogger } from '../helpers/LogHelper';

type TrackerSocketClientEvent = {
    donation: (amount: number, newTotal: number, displayName?: string | null) => void
}

const pingMessageInterval = 20000;
const expectedSocketClosureCode = 4001;

export class TrackerSocketClient extends (EventEmitter as new () => TypedEmitter<TrackerSocketClientEvent>) {
    private readonly address: string;
    private readonly trackerState: NodeCG.ServerReplicantWithSchemaDefault<TrackerState>;
    private logger: NodeCG.Logger;
    private socket?: WebSocket;
    private socketReconnectionTimeout?: NodeJS.Timeout;
    private socketPingTimeout?: NodeJS.Timeout;
    private isFirstReconnection = true;

    constructor(nodecg: NodeCG.ServerAPI<Configschema>) {
        super();
        if (!TrackerSocketClient.hasRequiredConfig(nodecg)) {
            throw new Error('Required GDQ tracker config is missing');
        }
        this.address = nodecg.bundleConfig.tracker!.socketAddress!;
        this.logger = createLogger(this, nodecg);
        this.trackerState = nodecg.Replicant('trackerState', { persistent: false }) as unknown as NodeCG.ServerReplicantWithSchemaDefault<TrackerState>;
    }

    start() {
        this.isFirstReconnection = false;
        this.connect();
    }

    private connect() {
        this.trackerState.value.donationSocket = 'CONNECTING';
        if (this.socketReconnectionTimeout) {
            clearTimeout(this.socketReconnectionTimeout);
        }

        if (this.socket) {
            this.socket.close(expectedSocketClosureCode);
        }

        // The origin is required. No clue why.
        this.socket = new WebSocket(this.address, { headers: { Origin: this.address } });

        this.socket.on('open', () => {
            this.logger.info('GDQ tracker socket is open');
            this.trackerState.value.donationSocket = 'CONNECTED';
            if (this.socketReconnectionTimeout) {
                clearTimeout(this.socketReconnectionTimeout);
            }
            this.isFirstReconnection = true;
            this.heartbeat();
        });

        this.socket.on('ping', () => {
            this.heartbeat();
        });

        this.socket.on('error', err => {
            this.logger.error(`Received error from GDQ tracker socket. Code: ${'code' in err ? err.code : '???'}; Message: ${err.message}`);
            this.logger.debug('Received error from GDQ tracker socket:', err);
        });

        this.socket.on('close', code => {
            if (this.socketPingTimeout) {
                clearTimeout(this.socketPingTimeout);
            }
            this.trackerState.value.donationSocket = 'NOT_CONNECTED';
            if (code !== expectedSocketClosureCode) {
                this.attemptReconnection();
            }
        });

        this.socket.on('message', msg => {
            const parsedMessage = JSON.parse(msg.toString());
            if ('new_total' in parsedMessage && 'amount' in parsedMessage) {
                this.emit('donation', parsedMessage.amount, parsedMessage.new_total, parsedMessage.donor__visiblename);
            } else {
                this.logger.debug('Received unrecognized message from GDQ tracker socket', parsedMessage);
            }
        });
    }

    private attemptReconnection() {
        if (this.isFirstReconnection) {
            this.logger.warn('GDQ tracker socket is closed');
        }
        this.socketReconnectionTimeout = setTimeout(() => {
            if (this.isFirstReconnection) {
                this.logger.info('Attempting to reconnect to GDQ tracker socket...');
            }
            this.isFirstReconnection = false;
            this.connect();
        }, 5000);
    }

    private heartbeat() {
        if (this.socketPingTimeout) {
            clearTimeout(this.socketPingTimeout);
        }

        this.socketPingTimeout = setTimeout(() => {
            this.logger.warn(`The GDQ tracker socket has been unreachable for ${pingMessageInterval} ms. Closing connection...`);
            this.connect();
        }, pingMessageInterval + 1000);
    }

    static hasRequiredConfig(nodecg: NodeCG.ServerAPI<Configschema>): boolean {
        return !!nodecg.bundleConfig.tracker?.socketAddress;
    }
}
