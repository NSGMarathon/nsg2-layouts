import { SpeedrunPlaylistState } from 'types/schemas';
import { defineStore } from 'pinia';
import { createReplicantStoreInitializer } from 'client-shared/helpers/StoreHelper';

const speedrunPlaylistState = nodecg.Replicant<SpeedrunPlaylistState>('speedrunPlaylistState');

interface SpeedrunPlaylistStore {
    speedrunPlaylistState: SpeedrunPlaylistState
}

export const useSpeedrunPlaylistStore = defineStore('speedrunPlaylist', {
    state: () => ({
        speedrunPlaylistState: null
    } as unknown as SpeedrunPlaylistStore)
});

export const initSpeedrunPlaylistStore = createReplicantStoreInitializer([speedrunPlaylistState], useSpeedrunPlaylistStore);
