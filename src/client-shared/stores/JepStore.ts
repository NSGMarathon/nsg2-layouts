import { JepBoard } from 'types/schemas/jepBoard';
import { JepState } from 'types/schemas/jepState';
import { defineStore } from 'pinia';
import { createReplicantStoreInitializer } from 'client-shared/helpers/StoreHelper';
import type NodeCG from '@nodecg/types';
import { JEP_CLUE_VALUE_MULTIPLIER } from 'shared/JepConstants';
import { JepContestants } from 'types/schemas/jepContestants';

const jepBoard = nodecg.Replicant<JepBoard>('jepBoard');
const jepContestants = nodecg.Replicant<JepContestants>('jepContestants');
const jepState = nodecg.Replicant<JepState>('jepState');
const jepContestantSignatures = nodecg.Replicant<NodeCG.AssetFile[]>('assets:jepContestantSignatures');
const jepContestantSymbols = nodecg.Replicant<NodeCG.AssetFile[]>('assets:jepContestantSymbols');

interface JepStore {
    jepBoard: JepBoard
    jepContestants: JepContestants
    jepState: JepState
    'assets:jepContestantSignatures': NodeCG.AssetFile[]
    'assets:jepContestantSymbols': NodeCG.AssetFile[]
}

export const useJepStore = defineStore('jep', {
    state: () => ({
        jepBoard: null,
        jepContestants: null,
        jepState: null,
        'assets:jepContestantSignatures': [],
        'assets:jepContestantSymbols': []
    } as unknown as JepStore),
    getters: {
        getClueValue: (state) => {
            return (clueIndex: number) => {
                const multiplier = JEP_CLUE_VALUE_MULTIPLIER * (state.jepBoard.round === 'DOUBLE_JEOPARDY' ? 2 : 1);
                return (clueIndex + 1) * multiplier;
            }
        }
    }
});

export const initJepStore = createReplicantStoreInitializer([
    jepBoard,
    jepContestants,
    jepState,
    jepContestantSignatures,
    jepContestantSymbols
], useJepStore);
