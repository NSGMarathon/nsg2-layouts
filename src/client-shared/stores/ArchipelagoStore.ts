import { ArchipelagoConfig } from 'types/schemas/archipelagoConfig';
import { ArchipelagoState } from 'types/schemas/archipelagoState';
import { defineStore } from 'pinia';
import { createReplicantStoreInitializer } from 'client-shared/helpers/StoreHelper';
import { isBlank } from 'shared/StringHelper';
import {
    ArchipelagoGoaledMessage,
    ArchipelagoItemCheatedMessage,
    ArchipelagoItemHintedMessage,
    ArchipelagoItemsSentMessage
} from 'types/messages/archipelago';

type BaseArchipelagoMessageQueueItem =
    (ArchipelagoItemsSentMessage & { type: 'itemsSent' }) |
    (ArchipelagoItemCheatedMessage & { type: 'itemCheated' }) |
    (ArchipelagoItemHintedMessage & { type: 'itemHinted' }) |
    (ArchipelagoGoaledMessage & { type: 'goaled' });

type ArchipelagoMessageQueueItem = BaseArchipelagoMessageQueueItem extends any ? BaseArchipelagoMessageQueueItem & { ordinal: number } : never;

let messageQueueNumber = 0;

const archipelagoConfig = nodecg.Replicant<ArchipelagoConfig>('archipelagoConfig');
const archipelagoState = nodecg.Replicant<ArchipelagoState>('archipelagoState');

const MESSAGE_LIFETIME = 7500;

interface ArchipelagoStore {
    archipelagoConfig: ArchipelagoConfig
    archipelagoState: ArchipelagoState

    countdown: number | null
    messageQueue: ArchipelagoMessageQueueItem[]
}

export const useArchipelagoStore = defineStore('archipelago', {
    state: () => ({
        archipelagoConfig: null,
        archipelagoState: null,
        countdown: null,
        messageQueue: []
    } as unknown as ArchipelagoStore),
    actions: {
        setEnabled(newValue: boolean) {
            archipelagoConfig.value!.enabled = newValue;
        },
        setConfig(serverAddress: string, slotName: string, password: string | undefined) {
            archipelagoConfig.value!.serverAddress = serverAddress;
            archipelagoConfig.value!.slotName = slotName;
            archipelagoConfig.value!.password = isBlank(password) ? undefined : password;
        },
        listenForEvents() {
            nodecg.listenFor('archipelago:itemsSent', (data: ArchipelagoItemsSentMessage) => {
                this.addMessageQueueItem({ type: 'itemsSent', ...data });
            });
            nodecg.listenFor('archipelago:itemCheated', (data: ArchipelagoItemCheatedMessage) => {
                this.addMessageQueueItem({ type: 'itemCheated', ...data });
            });
            nodecg.listenFor('archipelago:itemHinted', (data: ArchipelagoItemHintedMessage) => {
                this.addMessageQueueItem({ type: 'itemHinted', ...data });
            });
            nodecg.listenFor('archipelago:goaled', (data: ArchipelagoGoaledMessage) => {
                this.addMessageQueueItem({ type: 'goaled', ...data });
            });
            nodecg.listenFor('archipelago:countdown', (number: number) => {
                this.countdown = number;
                if (number === 0) {
                    setTimeout(() => {
                        this.countdown = null;
                    }, 1000);
                }
            });
        },
        addMessageQueueItem(item: BaseArchipelagoMessageQueueItem) {
            this.messageQueue.push({ ...item, ordinal: ++messageQueueNumber } as ArchipelagoMessageQueueItem);
            this.scheduleQueueItemRemoval();
        },
        removeFirstMessageQueueItem() {
            this.messageQueue.shift();
            if (this.messageQueue.length !== 0) {
                setTimeout(this.removeFirstMessageQueueItem, MESSAGE_LIFETIME);
            }
        },
        scheduleQueueItemRemoval() {
            if (this.messageQueue.length !== 1) return;
            setTimeout(this.removeFirstMessageQueueItem, MESSAGE_LIFETIME);
        }
    }
});

export const initArchipelagoStore = createReplicantStoreInitializer([archipelagoConfig, archipelagoState], useArchipelagoStore);
