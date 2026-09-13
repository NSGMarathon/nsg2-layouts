import { Client as ArchipelagoClient } from 'archipelago.js';
import { HasNodecgLogger } from '../helpers/HasNodecgLogger';
import type NodeCG from '@nodecg/types';
import { Configschema } from 'types/schemas';
import { ArchipelagoConfig } from 'types/schemas/archipelagoConfig';
import { ArchipelagoState } from 'types/schemas/archipelagoState';
import {
    ArchipelagoCountdownMessage, ArchipelagoGoaledMessage,
    ArchipelagoItemCheatedMessage,
    ArchipelagoItemHintedMessage,
    ArchipelagoItemsSentMessage
} from 'types/messages/archipelago';

export class ArchipelagoService extends HasNodecgLogger {
    private readonly nodecg: NodeCG.ServerAPI<Configschema>;
    private readonly archipelagoConfig: NodeCG.ServerReplicantWithSchemaDefault<ArchipelagoConfig>;
    private readonly archipelagoState: NodeCG.ServerReplicantWithSchemaDefault<ArchipelagoState>;

    private readonly client: ArchipelagoClient;
    private readonly sentItemQueue: Map<string, ArchipelagoItemsSentMessage['items']>;
    private readonly queueEmptyTimeouts: Record<string, NodeJS.Timeout>;

    constructor(nodecg: NodeCG.ServerAPI<Configschema>) {
        super(nodecg);

        this.nodecg = nodecg;
        this.archipelagoConfig = nodecg.Replicant('archipelagoConfig') as unknown as NodeCG.ServerReplicantWithSchemaDefault<ArchipelagoConfig>;
        this.archipelagoState = nodecg.Replicant('archipelagoState') as unknown as NodeCG.ServerReplicantWithSchemaDefault<ArchipelagoState>;

        this.archipelagoState.value.connectionState = 'NOT_CONNECTED';

        this.sentItemQueue = new Map();
        this.queueEmptyTimeouts = {};

        this.client = new ArchipelagoClient();

        this.archipelagoConfig.on('change', (newValue) => {
            if (newValue.enabled) {
                this.archipelagoState.value.connectionState = 'CONNECTING';

                this.client.login(
                    newValue.serverAddress,
                    newValue.slotName,
                    undefined,
                    {
                        tags: ['TextOnly'],
                        // the key must not exist in the object at all.
                        ...(newValue.password == null ? { } : { password: newValue.password })
                    }
                )
                    .then(() => {
                        this.archipelagoState.value.connectionState = 'CONNECTED';
                        this.logger.info('Connected!');
                    })
                    .catch((e) => {
                        this.archipelagoState.value.connectionState = 'NOT_CONNECTED';
                        this.logError('Failed to connect to room', e);
                    });
            } else {
                this.client.socket.disconnect();
                this.archipelagoState.value.connectionState = 'NOT_CONNECTED';
            }
        });

        this.client.messages.on('itemSent', (_, item) => {
            const key = `${item.sender.slot}_${item.receiver.slot}`;

            if (!this.sentItemQueue.has(key)) {
                this.sentItemQueue.set(key, []);
            }

            this.sentItemQueue.get(key)!.push({
                name: item.name,
                location: item.locationName
            });

            this.emptySentItemQueue(key, item.sender.alias, item.receiver.alias);
        });

        this.client.messages.on('itemCheated', (_, item) => {
            nodecg.sendMessage('archipelago:itemCheated', {
                receiverName: item.receiver.alias,
                itemName: item.name
            } satisfies ArchipelagoItemCheatedMessage);
        });

        this.client.messages.on('itemHinted', (_, item) => {
            nodecg.sendMessage('archipelago:itemHinted', {
                receiverName: item.receiver.alias,
                senderName: item.sender.alias,
                itemName: item.name,
                locationName: item.locationName
            } satisfies ArchipelagoItemHintedMessage);
        });

        this.client.messages.on('countdown', (_, number) => {
            nodecg.sendMessage('archipelago:countdown', number satisfies ArchipelagoCountdownMessage);
        });

        this.client.messages.on('goaled', (_, player) => {
            nodecg.sendMessage('archipelago:goaled', { playerName: player.alias } satisfies ArchipelagoGoaledMessage);
        });
    }

    private emptySentItemQueue(key: string, senderName: string, receiverName: string){
        clearTimeout(this.queueEmptyTimeouts[key]);

        this.queueEmptyTimeouts[key] = setTimeout(() => {
            const items = this.sentItemQueue.get(key) ?? [];
            this.nodecg.sendMessage('archipelago:itemsSent', {
                receiverName,
                senderName,
                items
            } satisfies ArchipelagoItemsSentMessage);
            this.sentItemQueue.delete(key);
        }, 100);
    }
}
