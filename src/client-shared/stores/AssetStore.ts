import type NodeCG from '@nodecg/types';
import { defineStore } from 'pinia';
import { createReplicantStoreInitializer } from 'client-shared/helpers/StoreHelper';

const mediaBoxImages = nodecg.Replicant<NodeCG.AssetFile[]>('assets:mediaBoxImages');

interface AssetStore {
    'assets:mediaBoxImages': NodeCG.AssetFile[]
    'assets:gameLayoutMediaBoxImages': NodeCG.AssetFile[]
    'assets:intermissionMediaBoxImages': NodeCG.AssetFile[]
}

export const useAssetStore = defineStore('assets', {
    state: () => ({
        'assets:mediaBoxImages': [],
        'assets:gameLayoutMediaBoxImages': [],
        'assets:intermissionMediaBoxImages': []
    } as AssetStore),
    getters: {
        allMediaBoxImages: (state) => ([
            ...state['assets:mediaBoxImages'],
            ...state['assets:gameLayoutMediaBoxImages'],
            ...state['assets:intermissionMediaBoxImages']
        ])
    }
});

export const initAssetStore = (graphicSpecificAssetReplicant: 'assets:gameLayoutMediaBoxImages' | 'assets:intermissionMediaBoxImages') => {
    const graphicSpecificAssets = nodecg.Replicant<NodeCG.AssetFile[]>(graphicSpecificAssetReplicant);

    return createReplicantStoreInitializer([mediaBoxImages, graphicSpecificAssets], useAssetStore)();
}
