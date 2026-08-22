import { JepBoard } from 'types/schemas/jepBoard';
import { CluePosition, JepState } from 'types/schemas/jepState';
import { defineStore } from 'pinia';
import { createReplicantStoreInitializer } from 'client-shared/helpers/StoreHelper';
import type NodeCG from '@nodecg/types';
import { JEP_CLUE_VALUE_MULTIPLIER, JEP_CLUES_PER_CATEGORY } from 'shared/JepConstants';
import { JepContestants } from 'types/schemas/jepContestants';
import { JepOverlays } from 'types/schemas/jepOverlays';

const jepBoard = nodecg.Replicant<JepBoard>('jepBoard');
const jepContestants = nodecg.Replicant<JepContestants>('jepContestants');
const jepState = nodecg.Replicant<JepState>('jepState');
const jepOverlays = nodecg.Replicant<JepOverlays>('jepOverlays');
const jepContestantSignatures = nodecg.Replicant<NodeCG.AssetFile[]>('assets:jepContestantSignatures');
const jepContestantSymbols = nodecg.Replicant<NodeCG.AssetFile[]>('assets:jepContestantSymbols');

interface JepStore {
    jepBoard: JepBoard
    jepContestants: JepContestants
    jepState: JepState
    jepOverlays: JepOverlays
    'assets:jepContestantSignatures': NodeCG.AssetFile[]
    'assets:jepContestantSymbols': NodeCG.AssetFile[]
}

export const useJepStore = defineStore('jep', {
    state: () => ({
        jepBoard: null,
        jepContestants: null,
        jepState: null,
        jepOverlays: null,
        'assets:jepContestantSignatures': [],
        'assets:jepContestantSymbols': []
    } as unknown as JepStore),
    getters: {
        getClueValue: (state) => {
            return (clueIndex: number) => {
                const multiplier = JEP_CLUE_VALUE_MULTIPLIER * (state.jepBoard.round === 'DOUBLE_JEOPARDY' ? 2 : 1);
                return (clueIndex + 1) * multiplier;
            }
        },
        maxDailyDoubleWager: (state) => state.jepState.state === 'DAILY_DOUBLE_AWAITING_WAGER' ? Math.max(
            (JEP_CLUE_VALUE_MULTIPLIER * (state.jepBoard.round === 'DOUBLE_JEOPARDY' ? 2 : 1) * JEP_CLUES_PER_CATEGORY),
            state.jepContestants[state.jepState.lastCluePickedByIndex].score) : null,
        finalJeopardyClue: (state) => {
            if (state.jepBoard.round !== 'FINAL_JEOPARDY') {
                return null;
            }

            return {
                categoryName: state.jepBoard.categories[0].name,
                ...state.jepBoard.categories[0].clues[0]
            }
        },
        focusedContestantIndex: (state) => {
            switch (state.jepState.state) {
                case 'AWAITING_ANSWER':
                    return state.jepState.buzzedByIndex;
                case 'DAILY_DOUBLE_AWAITING_WAGER':
                case 'DAILY_DOUBLE_AWAITING_ANSWER':
                    return state.jepState.lastCluePickedByIndex;
                case 'PICKING_CLUE':
                    return state.jepState.pickingContestantIndex;
                default:
                    return -1;
            }
        },
        selectedClue(state): { position: CluePosition, categoryName: string, value: number, prompt: string, answer: string, answered: boolean, isDailyDouble?: boolean } | null {
            if ('cluePosition' in state.jepState) {
                const cluePos = state.jepState.cluePosition as CluePosition;
                const category = state.jepBoard.categories[cluePos[0]];
                if (category != null) {
                    return {
                        position: cluePos,
                        categoryName: category.name,
                        value: this.getClueValue(cluePos[1]),
                        ...category.clues[cluePos[1]]
                    };
                }
            }

            return null;
        }
    },
    actions: {
        setScoreOverlayMode(newValue: JepOverlays['scoreOverlayMode']) {
            jepOverlays.value!.scoreOverlayMode = newValue;
        },
        revealClueBox() {
            jepOverlays.value!.clueBoxVisible = true;
        }
    }
});

export const initJepStore = createReplicantStoreInitializer([
    jepBoard,
    jepContestants,
    jepState,
    jepOverlays,
    jepContestantSignatures,
    jepContestantSymbols
], useJepStore);
