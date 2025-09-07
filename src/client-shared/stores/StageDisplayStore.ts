import { ObsState } from 'types/schemas';
import { defineStore } from 'pinia';
import { createReplicantStoreInitializer } from 'client-shared/helpers/StoreHelper';
import { StageDisplayState } from 'types/schemas/stageDisplayState';
import { sendMessage } from 'client-shared/helpers/NodecgHelper';

const obsState = nodecg.Replicant<ObsState>('obsState');
const stageDisplayState = nodecg.Replicant<StageDisplayState>('stageDisplayState');

interface StageDisplayStore {
    obsState: ObsState
    stageDisplayState: StageDisplayState
}

export const useStageDisplayStore = defineStore('stage-display', {
    state: () => ({
        obsState: null,
        stageDisplayState: null
    } as unknown as StageDisplayStore),
    actions: {
        setShowPlacementHelpers(newValue: boolean) {
            stageDisplayState.value!.showPlacementHelpers = newValue;
        },
        showMessage(color: StageDisplayState['message']['color'], text: string, mode?: StageDisplayState['message']['mode']) {
            if (
                stageDisplayState.value!.message.visible
                && (mode == 'QUICK' || stageDisplayState.value!.message.mode === 'QUICK')
                && stageDisplayState.value!.message.text === text
                && stageDisplayState.value!.message.color === color
            ) {
                sendMessage('stage-display:flash');
            } else {
                stageDisplayState.value!.message = {
                    visible: true,
                    mode: mode ?? stageDisplayState.value!.message.mode,
                    color,
                    text
                }
            }
        },
        hideMessage() {
            stageDisplayState.value!.message.visible = false;
        },
        setStageDisplayMode(newValue: StageDisplayState['mode']) {
            stageDisplayState.value!.mode = newValue;
        }
    }
});

export const initStageDisplayStore = createReplicantStoreInitializer([obsState, stageDisplayState], useStageDisplayStore);
