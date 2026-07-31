import type NodeCG from '@nodecg/types';
import type { Configschema, CountdownData, CountdownTimer } from 'types/schemas';

export class CountdownService {
    private readonly countdownTimer: NodeCG.ServerReplicantWithSchemaDefault<CountdownTimer>;
    private readonly countdownData: NodeCG.ServerReplicantWithSchemaDefault<CountdownData>;
    private countdownInterval: NodeJS.Timeout | undefined = undefined;
    private lastTickTime: number = 0;

    constructor(nodecg: NodeCG.ServerAPI<Configschema>) {
        this.countdownData = nodecg.Replicant('countdownData') as unknown as NodeCG.ServerReplicantWithSchemaDefault<CountdownData>;
        this.countdownTimer = nodecg.Replicant('countdownTimer') as unknown as NodeCG.ServerReplicantWithSchemaDefault<CountdownTimer>;

        this.countdownData.on('change', (newValue, oldValue) => {
            if (oldValue == null && newValue.running) {
                this.startTimer();
            }
            if (oldValue == null) return;
            if (newValue.running && !oldValue.running) {
                this.startTimer();
            } else if (!newValue.running && oldValue.running) {
                this.stopTimer();
            }
        });
    }

    private startTimer() {
        this.lastTickTime = new Date().valueOf();
        this.countdownInterval = setInterval(() => {
            const currentTime = new Date().valueOf();
            this.countdownTimer.value = Math.max(0, this.countdownTimer.value - (currentTime - this.lastTickTime));
            if (this.countdownTimer.value === 0) {
                this.countdownData.value.running = false;
            }
            this.lastTickTime = currentTime;
        }, 200);
    }

    private stopTimer() {
        clearInterval(this.countdownInterval);
    }
}
