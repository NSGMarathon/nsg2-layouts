import {
    ActiveGameLayouts,
    ObsConfig,
    ObsConnectionInfo,
    ObsState,
    ObsVideoInputAssignments,
    ObsVideoInputPositions
} from 'types/schemas';
import { defineStore } from 'pinia';
import { createReplicantStoreInitializer } from 'client-shared/helpers/StoreHelper';
import { layouts } from 'types/Layouts';

const obsState = nodecg.Replicant<ObsState>('obsState');
const obsConfig = nodecg.Replicant<ObsConfig>('obsConfig');
const obsConnectionInfo = nodecg.Replicant<ObsConnectionInfo>('obsConnectionInfo');
const obsVideoInputAssignments = nodecg.Replicant<ObsVideoInputAssignments>('obsVideoInputAssignments');
const obsVideoInputPositions = nodecg.Replicant<ObsVideoInputPositions>('obsVideoInputPositions');
const activeGameLayouts = nodecg.Replicant<ActiveGameLayouts>('activeGameLayouts');

interface ObsStore {
    obsState: ObsState
    obsConfig: ObsConfig
    obsConnectionInfo: ObsConnectionInfo
    obsVideoInputAssignments: ObsVideoInputAssignments
    obsVideoInputPositions: ObsVideoInputPositions
    activeGameLayouts: ActiveGameLayouts
}

export const useObsStore = defineStore('obs', {
    state: () => ({
        obsState: null,
        obsConfig: null,
        obsConnectionInfo: null,
        obsVideoInputAssignments: null,
        obsVideoInputPositions: null,
        activeGameLayouts: null
    } as unknown as ObsStore),
    actions: {
        setVideoInputPositions(index: number, newValue: ObsVideoInputPositions[number]) {
            obsVideoInputPositions.value![index] = newValue;
        },
        setActiveGameLayout(index: number, newValue: keyof typeof layouts) {
            activeGameLayouts.value![index] = newValue;
        }
    }
});

export const initObsStore = createReplicantStoreInitializer([
    obsState,
    obsConfig,
    obsConnectionInfo,
    obsVideoInputAssignments,
    obsVideoInputPositions,
    activeGameLayouts
], useObsStore);
