import { BingoState } from 'types/schemas/bingoState';
import { BingoConfig } from 'types/schemas/bingoConfig';
import { defineStore } from 'pinia';
import { createReplicantStoreInitializer } from 'client-shared/helpers/StoreHelper';
import { BingoTalentMapping } from 'types/schemas/bingoTalentMapping';

const bingoState = nodecg.Replicant<BingoState>('bingoState');
const bingoConfig = nodecg.Replicant<BingoConfig>('bingoConfig');
const bingoTalentMapping = nodecg.Replicant<BingoTalentMapping>('bingoTalentMapping');

interface BingoStore {
    bingoState: BingoState
    bingoConfig: BingoConfig
    bingoTalentMapping: BingoTalentMapping
}

export const useBingoStore = defineStore('bingo', {
    state: () => ({
        bingoState: null,
        bingoConfig: null,
        bingoTalentMapping: []
    } as unknown as BingoStore),
    actions: {
        setBingoConfig(roomSlug: string, roomPassword: string) {
            bingoConfig.value = {
                enabled: bingoConfig.value!.enabled,
                roomPassword,
                roomSlug
            };
        },
        setBingoEnabled(enabled: boolean) {
            bingoConfig.value!.enabled = enabled;
        },
        setBingoTalentMapping(newValue: BingoTalentMapping) {
            bingoTalentMapping.value = newValue;
        }
    }
});

export const initBingoStore = createReplicantStoreInitializer([bingoState, bingoConfig, bingoTalentMapping], useBingoStore);
