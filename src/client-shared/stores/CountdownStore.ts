import { CountdownData, CountdownTimer } from 'types/schemas';
import { defineStore } from 'pinia';
import { createReplicantStoreInitializer } from 'client-shared/helpers/StoreHelper';

const countdownData = nodecg.Replicant<CountdownData>('countdownData');
const countdownTimer = nodecg.Replicant<CountdownTimer>('countdownTimer');

interface CountdownStore {
    countdownData: CountdownData
    countdownTimer: CountdownTimer
}

export const useCountdownStore = defineStore('countdown', {
    state: () => ({
        countdownData: null,
        countdownTimer: 0
    } as unknown as CountdownStore),
    actions: {
        setCountdownMessage(message: string) {
            countdownData.value!.messageText = message;
        },
        setCountdownTimer(timer: number) {
            countdownTimer.value = timer;
        },
        setCountdownRunning(running: boolean) {
            countdownData.value!.running = running;
        },
        setShowBackground(newValue: boolean) {
            countdownData.value!.showBackground = newValue;
        }
    }
});

export const initCountdownStore = createReplicantStoreInitializer([countdownTimer, countdownData], useCountdownStore);
