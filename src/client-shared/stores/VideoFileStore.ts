import { VideoFiles } from 'types/schemas';
import { defineStore } from 'pinia';
import { createReplicantStoreInitializer } from 'client-shared/helpers/StoreHelper';

const videoFiles = nodecg.Replicant<VideoFiles>('videoFiles');

interface VideoFileStore {
    videoFiles: VideoFiles
}

export const useVideoFileStore = defineStore('videoFiles', {
    state: () => ({
        videoFiles: null
    } as unknown as VideoFileStore)
});

export const initVideoFileStore = createReplicantStoreInitializer([videoFiles], useVideoFileStore);
