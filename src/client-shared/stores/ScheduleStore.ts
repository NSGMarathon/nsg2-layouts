import {
    ActiveRelayPlayers,
    ActiveSpeedrun,
    NextSpeedrun,
    OtherScheduleItem,
    PlayerNameplateAssignments,
    Schedule, Speedrun
} from 'types/schemas';
import { defineStore } from 'pinia';
import { createReplicantStoreInitializer } from 'client-shared/helpers/StoreHelper';
import { ScheduleItem, ScheduleItemType } from 'types/ScheduleHelpers';
import { isBlank } from 'shared/StringHelper';
import { isIgnorableScheduleItem } from 'shared/ScheduleHelper';

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
                    && (completed !== false || !isIgnorableScheduleItem(scheduleItem))
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
        interstitialsBefore(state) {
            return (scheduleItemIndex: number) => {
                if (scheduleItemIndex <= 0) return [];

                const result: OtherScheduleItem[] = [];
                for (let i = scheduleItemIndex - 1; i >= 0; i--) {
                    const scheduleItem = state.schedule.items[i];
                    if (scheduleItem.type === 'SPEEDRUN') break;
                    result.push(scheduleItem);
                }
                return result.reverse();
            }
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
        },
        getNameplateGlobalTeamName: state => (feedIndex: number, assignment?: PlayerNameplateAssignments[number]['assignments'][number]): string | null => {
            if (assignment == null
                || assignment.players.length <= 1
                || state.activeSpeedrun == null
                || state.activeSpeedrun?.teams.length === 1) return null;

            const firstAssignedTeamId = assignment.players[0].teamId;
            const isSingleTeamNameplate = assignment.players.slice(1).every(player => player.teamId === firstAssignedTeamId);

            if (isSingleTeamNameplate) {
                const teamData = state.activeSpeedrun.teams.find(team => team.id === firstAssignedTeamId);
                if (state.activeSpeedrun?.relay) return isBlank(teamData?.name) ? null : teamData!.name!;

                if (
                    state.playerNameplateAssignments[feedIndex].assignments
                        .filter(otherAssignment => otherAssignment.players.some(player => player.teamId === firstAssignedTeamId)).length === 1
                ) {
                    return isBlank(teamData?.name) ? null : teamData!.name!;
                }
            }

            return null;
        },
        speedrunPlaylist(state) {
            if (this.activeSpeedrunIndex === -1 || state.activeSpeedrun?.videoFile == null) return [];

            const result: Speedrun[] = [];
            for (let i = this.activeSpeedrunIndex; i < state.schedule.items.length; i++) {
                const scheduleItem = state.schedule.items[i];
                if (scheduleItem.type !== 'SPEEDRUN') continue;
                if (scheduleItem.videoFile == null) break;
                result.push(scheduleItem);
            }
            for (let i = this.activeSpeedrunIndex - 1; i > 0; i--) {
                const scheduleItem = state.schedule.items[i];
                if (scheduleItem.type !== 'SPEEDRUN') continue;
                if (scheduleItem.videoFile == null) break;
                result.unshift(scheduleItem);
            }
            return result;
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
