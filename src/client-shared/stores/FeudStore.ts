import { FeudBoard } from 'types/schemas/feudBoard';
import { FeudState } from 'types/schemas/feudState';
import { FeudTeamInfo } from 'types/schemas/feudTeamInfo';
import { defineStore } from 'pinia';
import { createReplicantStoreInitializer } from 'client-shared/helpers/StoreHelper';
import { Configschema } from 'types/schemas';
import { FeudLowerThirdMode } from 'types/schemas/feudLowerThirdMode';

const feudBoard = nodecg.Replicant<FeudBoard>('feudBoard');
const feudState = nodecg.Replicant<FeudState>('feudState');
const feudTeamInfo = nodecg.Replicant<FeudTeamInfo>('feudTeamInfo');
const feudLowerThirdMode = nodecg.Replicant<FeudLowerThirdMode>('feudLowerThirdMode');

interface FeudStore {
    feudBoard: FeudBoard;
    feudState: FeudState;
    feudTeamInfo: FeudTeamInfo;
    feudLowerThirdMode: FeudLowerThirdMode;
}

export const feudConfig = (nodecg.bundleConfig as Configschema).feudQuestions;

export const useFeudStore = defineStore('feud', {
    state: () => ({
        feudBoard: null,
        feudState: null,
        feudTeamInfo: null,
        feudLowerThirdMode: 'HIDDEN',
    } as unknown as FeudStore),
    actions: {
        setTeamNames(teamAName: string, teamBName: string) {
            feudTeamInfo.value!.teamA.name = teamAName;
            feudTeamInfo.value!.teamB.name = teamBName;
        },
        setLowerThirdMode(newValue: FeudLowerThirdMode) {
            feudLowerThirdMode.value = newValue;
        },
    },
    getters: {
        guessedAnswerValue(state) {
            if (state.feudState.state === 'END_OF_ROUND') {
                return state.feudState.pointsWon;
            }

            const result = state.feudBoard.answers.filter((answer) => answer.guessed).reduce((result, answer) => result + answer.value, 0);

            if (state.feudBoard.roundNumber === 3) {
                return result * 2;
            } else if (state.feudBoard.roundNumber === 4) {
                return result * 3;
            } else {
                return result;
            }
        }
    }
});

export const initFeudStore = createReplicantStoreInitializer([
    feudBoard,
    feudState,
    feudTeamInfo,
    feudLowerThirdMode,
], useFeudStore);
