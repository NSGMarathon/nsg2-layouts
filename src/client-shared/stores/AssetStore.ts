import type NodeCG from '@nodecg/types';
import { defineStore } from 'pinia';
import { createReplicantStoreInitializer } from 'client-shared/helpers/StoreHelper';

const mediaBoxImages = nodecg.Replicant<NodeCG.AssetFile[]>('assets:mediaBoxImages');

interface AssetStore {
    'assets:mediaBoxImages': NodeCG.AssetFile[]
}

export const useAssetStore = defineStore('assets', {
    state: () => ({
        'assets:mediaBoxImages': []
    } as AssetStore)
});

export const initAssetStore = createReplicantStoreInitializer([mediaBoxImages], useAssetStore);
