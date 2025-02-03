import {
    ActiveRelayPlayers,
    ActiveSpeedrun,
    NextSpeedrun,
    OtherScheduleItem,
    PlayerNameplateAssignments,
    Schedule
} from 'types/schemas';
import { defineStore } from 'pinia';
import { createReplicantStoreInitializer } from 'client-shared/helpers/StoreHelper';
import { ScheduleItem, ScheduleItemType } from 'types/ScheduleHelpers';

const schedule = nodecg.Replicant<Schedule>('schedule');
const activeSpeedrun = nodecg.Replicant<ActiveSpeedrun>('activeSpeedrun');
const nextSpeedrun = nodecg.Replicant<NextSpeedrun>('nextSpeedrun');
const playerNameplateAssignments = nodecg.Replicant<PlayerNameplateAssignments>('playerNameplateAssignments');
const activeRelayPlayers = nodecg.Replicant<ActiveRelayPlayers>('activeRelayPlayers');

interface ScheduleStore {
    schedule: Schedule
    activeSpeedrun: ActiveSpeedrun
    nextSpeedrun: NextSpeedrun
    playerNameplateAssignments: PlayerNameplateAssignments
    activeRelayPlayers: ActiveRelayPlayers
}

export const useScheduleStore = defineStore('schedule', {
    state: () => ({
        schedule: null,
        activeSpeedrun: null,
        nextSpeedrun: null,
        playerNameplateAssignments: null,
        activeRelayPlayers: null
    } as unknown as ScheduleStore),
    getters: {
        activeSpeedrunIndex: state => state.activeSpeedrun == null ? -1 : state.schedule.items.findIndex(scheduleItem => scheduleItem.id === state.activeSpeedrun!.id),
        speedrunCount: state => (currentScheduleItemId?: string) => {
            const speedruns = state.schedule.items.filter(scheduleItem => scheduleItem.type === 'SPEEDRUN');
            return {
                total: speedruns.length,
                current: currentScheduleItemId == null ? -1 : (speedruns.findIndex(speedrun => speedrun.id === currentScheduleItemId) + 1)
            };
        },
        findScheduleItemAfter: state => (scheduleItemId: string | undefined | null, types?: ScheduleItemType[], completed?: boolean): ScheduleItem | null => {
            if (scheduleItemId == null) return null;
            const scheduleItemIndex = state.schedule.items.findIndex(scheduleItem => scheduleItem.id === scheduleItemId);
            if (scheduleItemIndex === -1) return null;

            for (let i = scheduleItemIndex + 1; i < state.schedule.items.length; i++) {
                const scheduleItem = state.schedule.items[i];
                if (
                    (types == null || types.includes(scheduleItem.type))
                    && (completed == null || scheduleItem.type === 'SPEEDRUN' || (!completed && scheduleItem.completed == null) || scheduleItem.completed === completed)
                ) return scheduleItem;
            }
            return null;
        },
        interstitialsBeforeActiveRun(state) {
            if (this.activeSpeedrunIndex <= 0) return [];

            const result: OtherScheduleItem[] = [];
            for (let i = this.activeSpeedrunIndex - 1; i >= 0; i--) {
                const scheduleItem = state.schedule.items[i];
                if (scheduleItem.type === 'SPEEDRUN') break;
                result.push(scheduleItem);
            }
            return result.reverse();
        },
        activeSpeedrunTalentIds(state): string[] {
            const talentIds = new Set<string>();
            if (state.activeSpeedrun != null) {
                state.activeSpeedrun.teams.forEach(team => {
                    team.playerIds.forEach(playerId => {
                        talentIds.add(playerId.id);
                    });
                });
                state.activeSpeedrun.commentatorIds.forEach(commentatorId => {
                    talentIds.add(commentatorId.id);
                });
            }
            return Array.from(talentIds.values());
        }
    }
});

export const initScheduleStore = createReplicantStoreInitializer([
    schedule,
    activeSpeedrun,
    nextSpeedrun,
    playerNameplateAssignments,
    activeRelayPlayers
], useScheduleStore);
