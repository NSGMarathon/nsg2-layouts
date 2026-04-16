import { FeudBoard } from 'types/schemas/feudBoard';
import { FeudState } from 'types/schemas/feudState';
import { FeudTeamInfo } from 'types/schemas/feudTeamInfo';
import { defineStore } from 'pinia';
import { createReplicantStoreInitializer } from 'client-shared/helpers/StoreHelper';
import { Configschema } from 'types/schemas';

const feudBoard = nodecg.Replicant<FeudBoard>('feudBoard');
const feudState = nodecg.Replicant<FeudState>('feudState');
const feudTeamInfo = nodecg.Replicant<FeudTeamInfo>('feudTeamInfo');

interface FeudStore {
    feudBoard: FeudBoard;
    feudState: FeudState;
    feudTeamInfo: FeudTeamInfo;
}

export const feudConfig = (nodecg.bundleConfig as Configschema).feudQuestions;

export const useFeudStore = defineStore('feud', {
    state: () => ({
        feudBoard: null,
        feudState: null,
        feudTeamInfo: null,
    } as unknown as FeudStore),
    actions: {
        setTeamNames(teamAName: string, teamBName: string) {
            feudTeamInfo.value!.teamA.name = teamAName;
            feudTeamInfo.value!.teamB.name = teamBName;
        }
    }
});

export const initFeudStore = createReplicantStoreInitializer([feudBoard, feudState, feudTeamInfo], useFeudStore);
