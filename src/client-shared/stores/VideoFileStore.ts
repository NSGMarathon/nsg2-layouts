import { SpeedrunPlaylistState, VideoFiles } from 'types/schemas';
import { defineStore } from 'pinia';
import { createReplicantStoreInitializer } from 'client-shared/helpers/StoreHelper';

const videoFiles = nodecg.Replicant<VideoFiles>('videoFiles');
const speedrunPlaylistState = nodecg.Replicant<SpeedrunPlaylistState>('speedrunPlaylistState');

interface VideoFileStore {
    videoFiles: VideoFiles
    speedrunPlaylistState: SpeedrunPlaylistState
}

export const useVideoFileStore = defineStore('videoFiles', {
    state: () => ({
        videoFiles: null,
        speedrunPlaylistState: null
    } as unknown as VideoFileStore)
});

export const initVideoFileStore = createReplicantStoreInitializer([videoFiles, speedrunPlaylistState], useVideoFileStore);
