import { VideoFiles } from 'types/schemas';
import { defineStore } from 'pinia';
import { createReplicantStoreInitializer } from 'client-shared/helpers/StoreHelper';
import { InterstitialVideoState } from 'types/schemas/interstitialVideoState';

const videoFiles = nodecg.Replicant<VideoFiles>('videoFiles');
const interstitialVideoState = nodecg.Replicant<InterstitialVideoState>('interstitialVideoState');

interface VideoFileStore {
    videoFiles: VideoFiles
    interstitialVideoState: InterstitialVideoState
}

export const useVideoFileStore = defineStore('videoFiles', {
    state: () => ({
        videoFiles: null,
        interstitialVideoState: null
    } as unknown as VideoFileStore)
});

export const initVideoFileStore = createReplicantStoreInitializer([videoFiles, interstitialVideoState], useVideoFileStore);
