import type NodeCG from '@nodecg/types';
import type { ActiveSpeedrun, Configschema, Schedule, ScheduleImportStatus, Speedrun, Talent } from 'types/schemas';
import { OengusClient } from '../clients/OengusClient';
import { TalentService } from './TalentService';
import { v4 as uuidV4 } from 'uuid';
import mergeWith from 'lodash/mergeWith';
import cloneDeep from 'lodash/cloneDeep';
import { ScheduleItem, ScheduleItemType } from 'types/ScheduleHelpers';
import { DateTime, Duration } from 'luxon';
import { SpeedrunService } from './SpeedrunService';
import { findActiveScheduleItem } from '../helpers/ScheduleHelpers';
import { IgdbService } from './IgdbService';
import { HasNodecgLogger } from '../helpers/HasNodecgLogger';
import { isBlank } from 'shared/StringHelper';

// todo: calculate scheduled start times for schedule items manually

export class ScheduleService extends HasNodecgLogger {
    private readonly scheduleImportStatus: NodeCG.ServerReplicantWithSchemaDefault<ScheduleImportStatus>;
    readonly schedule: NodeCG.ServerReplicantWithSchemaDefault<Schedule>;
    private readonly talent: NodeCG.ServerReplicantWithSchemaDefault<Talent>;
    private readonly activeSpeedrun: NodeCG.ServerReplicantWithSchemaDefault<ActiveSpeedrun>;
    private readonly oengusClient: OengusClient;
    private readonly talentService: TalentService;
    private readonly igdbService: IgdbService | null;
    private speedrunService?: SpeedrunService;

    constructor(
        nodecg: NodeCG.ServerAPI<Configschema>,
        oengusClient: OengusClient,
        talentService: TalentService,
        igdbService: IgdbService | null
    ) {
        super(nodecg);
        this.scheduleImportStatus = nodecg.Replicant('scheduleImportStatus', { persistent: false }) as unknown as NodeCG.ServerReplicantWithSchemaDefault<ScheduleImportStatus>;
        this.schedule = nodecg.Replicant('schedule') as unknown as NodeCG.ServerReplicantWithSchemaDefault<Schedule>;
        this.talent = nodecg.Replicant('talent') as unknown as NodeCG.ServerReplicantWithSchemaDefault<Talent>;
        this.activeSpeedrun = nodecg.Replicant('activeSpeedrun') as unknown as NodeCG.ServerReplicantWithSchemaDefault<ActiveSpeedrun>;
        this.oengusClient = oengusClient;
        this.talentService = talentService;
        this.igdbService = igdbService;
    }

    init(speedrunService: SpeedrunService) {
        this.speedrunService = speedrunService;
    }

    async importSchedule(slug: string, mergeExisting: boolean): Promise<void> {
        const scheduleAndTalent = await this.oengusClient.getScheduleAndTalent(slug);
        this.validateDate(scheduleAndTalent.schedule.startTime);

        const newTalentList = this.talentService.mergeNewTalentList(scheduleAndTalent.talent);
        const scheduleWithTalentIds = this.talentService.getScheduleWithTalentIds(scheduleAndTalent.schedule.items, newTalentList);
        if (this.schedule.value.id === slug && mergeExisting) {
            const mergedSchedule = this.mergeNewScheduleItems(scheduleWithTalentIds);
            const scheduleWithTwitchCategories = await this.getScheduleWithTwitchGames(mergedSchedule);
            this.talent.value = newTalentList;
            this.schedule.value = {
                source: 'OENGUS',
                id: slug,
                startTime: scheduleAndTalent.schedule.startTime,
                items: scheduleWithTwitchCategories
            };
        } else {
            const scheduleWithTwitchCategories = await this.getScheduleWithTwitchGames(scheduleWithTalentIds);
            this.talent.value = newTalentList;
            this.schedule.value = {
                source: 'OENGUS',
                id: slug,
                startTime: scheduleAndTalent.schedule.startTime,
                items: this.generateScheduleItemAndTeamIds(scheduleWithTwitchCategories)
            };
        }
    }

    setInterstitialCompleted(scheduleItemId: string, completed: boolean) {
        const scheduleItem = this.getScheduleItem(scheduleItemId);
        if (scheduleItem.type === 'SPEEDRUN') {
            throw new Error(`Schedule item with ID ${scheduleItemId} is not an interstitial`);
        }
        scheduleItem.completed = completed;
    }

    getScheduleItem(scheduleItemId: string): Schedule['items'][number] {
        const scheduleItem = this.schedule.value.items.find(scheduleItem => scheduleItem.id === scheduleItemId);
        if (scheduleItem == null) {
            throw new Error(`Could not get schedule item with ID ${scheduleItemId}`);
        }
        return scheduleItem;
    }

    findScheduleItemAfter(scheduleItemId: string | undefined | null, type?: ScheduleItemType): ScheduleItem | null {
        if (scheduleItemId == null) return null;
        const scheduleItemIndex = this.schedule.value.items.findIndex(scheduleItem => scheduleItem.id === scheduleItemId);
        if (scheduleItemIndex === -1) return null;

        for (let i = scheduleItemIndex + 1; i < this.schedule.value.items.length; i++) {
            const scheduleItem = this.schedule.value.items[i];
            if (type == null || scheduleItem.type === type) return scheduleItem;
        }
        return null;
    }

    findScheduleItemBefore(scheduleItemId: string | undefined | null, type?: ScheduleItemType): ScheduleItem | null {
        if (scheduleItemId == null) return null;
        const scheduleItemIndex = this.schedule.value.items.findIndex(scheduleItem => scheduleItem.id === scheduleItemId);
        if (scheduleItemIndex <= 0) return null;

        for (let i = scheduleItemIndex - 1; i >= 0; i--) {
            const scheduleItem = this.schedule.value.items[i];
            if (type == null || scheduleItem.type === type) return scheduleItem;
        }
        return null;
    }

    updateScheduleItem(item: ScheduleItem) {
        if (!item.id) {
            throw new Error('Schedule item ID must not be blank');
        }
        const scheduleItemIndex = this.schedule.value.items.findIndex(scheduleItem => scheduleItem.id === item.id);
        if (scheduleItemIndex === -1) {
            throw new Error(`Schedule item with ID ${item.id} does not already exist`);
        }

        this.validateDuration(item.estimate);
        this.validateDuration(item.setupTime);
        this.validateDate(item.scheduledStartTime);
        if (item.type === 'SPEEDRUN' && item.videoFile != null) {
            const timerStartTime = Duration.fromISO(item.videoFile.timerStartTime);
            const timerStopTime = Duration.fromISO(item.videoFile.timerStopTime);

            if (!timerStartTime.isValid || !timerStopTime.isValid) {
                throw new Error('Video file timer stop or start time is not valid');
            }
            if (timerStartTime >= timerStopTime) {
                throw new Error('Video file timer stop time must be greater than timer start time');
            }
        }

        const normalizedItem: ScheduleItem = cloneDeep(item);

        if (normalizedItem.type === 'SPEEDRUN') {
            normalizedItem.commentatorIds = normalizedItem.commentatorIds.filter(commentatorId => this.talentService.talentItemExists(commentatorId.id));
            normalizedItem.teams = normalizedItem.teams
                .map(team => ({
                    ...team,
                    id: !team.id ? uuidV4() : team.id,
                    playerIds: team.playerIds.filter(playerId => this.talentService.talentItemExists(playerId.id))
                }))
                .filter(team => team.playerIds.length > 0);
            if (normalizedItem.teams.length === 0) {
                throw new Error('Schedule item has no players!');
            }
        } else {
            normalizedItem.talentIds = normalizedItem.talentIds.filter(talentId => this.talentService.talentItemExists(talentId.id));
            normalizedItem.description = isBlank(normalizedItem.description) ? null : normalizedItem.description;
        }

        this.schedule.value.items[scheduleItemIndex] = normalizedItem;
        this.speedrunService?.updateSpeedruns(normalizedItem);
    }

    findActiveScheduleItem(): ScheduleItem | null {
        return findActiveScheduleItem(this.schedule.value.items, this.activeSpeedrun.value);
    }

    private validateDate(date: string | undefined | null) {
        if (!!date && !DateTime.fromISO(date).isValid) {
            throw new Error(`"${date}" is not a valid ISO 8601 date`);
        }
    }

    private validateDuration(duration: string | undefined | null) {
        if (!!duration && !Duration.fromISO(duration).isValid) {
            throw new Error(`"${duration}" is not a valid ISO 8601 duration`);
        }
    }

    private generateScheduleItemAndTeamIds(schedule: Schedule['items']): Schedule['items'] {
        return cloneDeep(schedule).map(scheduleItem => {
            if (scheduleItem.type !== 'SPEEDRUN') {
                return {
                    ...scheduleItem,
                    id: uuidV4()
                };
            }

            return {
                ...scheduleItem,
                id: uuidV4(),
                teams: scheduleItem.teams.map(team => ({
                    ...team,
                    id: uuidV4()
                }))
            };
        });
    }

    private async getScheduleWithTwitchGames(schedule: Schedule['items']): Promise<Schedule['items']> {
        if (this.igdbService == null || !this.igdbService.isLoggedIn()) {
            this.logger.warn('Twitch integration is disabled. Schedule will be imported without Twitch category data.');
            return schedule;
        }

        const newSchedule = cloneDeep(schedule);
        const gameSearchResult = await Promise.allSettled(newSchedule.map(async (scheduleItem) => {
            if (scheduleItem.type !== 'SPEEDRUN' || scheduleItem.twitchCategory != null) return;
            const gameData = await this.igdbService!.findGameForScheduleItem(scheduleItem);
            scheduleItem.twitchCategory = gameData?.category;
            scheduleItem.releaseYear = gameData?.releaseYear;
        }));

        const rejectedResults = gameSearchResult.filter(result => result.status === 'rejected')
        if (rejectedResults.length > 0) {
            this.logger.warn('Encountered one or more errors searching for Twitch categories for schedule games');
            this.logger.debug('Encountered one or more errors searching for Twitch categories for schedule games', rejectedResults);
        }
        return newSchedule;
    }

    private mergeNewScheduleItems(schedule: Schedule['items']): Schedule['items'] {
        const newItems: Schedule['items'] = [];
        let newScheduleItemCount = 0;
        let updatedScheduleItemCount = 0;

        schedule.forEach(newScheduleItem => {
            const existingScheduleItem = this.schedule.value.items.find(existing => existing.externalId != null && existing.externalId === newScheduleItem.externalId);

            if (existingScheduleItem == null) {
                newScheduleItemCount++;
                newItems.push({
                    ...newScheduleItem,
                    id: uuidV4()
                });
            } else {
                updatedScheduleItemCount++;
                newItems.push(mergeWith(cloneDeep(existingScheduleItem), newScheduleItem, (objValue, srcValue, key, obj, src) => {
                    if (srcValue == null || key === 'id') {
                        return objValue;
                    }
                    if (key === 'teams' && objValue != null) {
                        const newTeams = srcValue as Speedrun['teams'];
                        const oldTeams = objValue as Speedrun['teams'];

                        if (oldTeams.length === 1 && newTeams.length === 1) {
                            const oldTeam = oldTeams[0];
                            return [
                                {
                                    id: oldTeam.id,
                                    name: oldTeam.name,
                                    playerIds: newTeams[0].playerIds
                                }
                            ] satisfies Speedrun['teams'];
                        }

                        // todo: this will remove any players that weren't on the schedule but were instead added by us through NodeCG
                        const result: Speedrun['teams'] = [];
                        newTeams.forEach(newTeam => {
                            const matchingOldTeamsForPlayers = newTeam.playerIds
                                .map(newTeamPlayer => oldTeams.find(oldTeam => oldTeam.playerIds.some(oldTeamPlayer => newTeamPlayer.id === oldTeamPlayer.id)))
                                .filter(Boolean) as Speedrun['teams'];

                            if (matchingOldTeamsForPlayers.length === 1 || new Set(matchingOldTeamsForPlayers.map(team => team.id)).size === 1) {
                                // All of these players either weren't previously on a team or played for the same team
                                const matchingOldTeam = matchingOldTeamsForPlayers[0];
                                const existingNewTeam = result.find(resultTeam => resultTeam.id === matchingOldTeam.id);
                                if (existingNewTeam != null) {
                                    existingNewTeam.playerIds.push(...newTeam.playerIds);
                                } else {
                                    result.push({
                                        ...matchingOldTeam,
                                        name: newTeam.name || matchingOldTeam.name,
                                        playerIds: newTeam.playerIds
                                    });
                                }
                            } else {
                                // All these players weren't previously on a team or played on different teams
                                result.push({
                                    ...newTeam,
                                    id: uuidV4()
                                });
                            }
                        });
                        return result;
                    }
                    if (key === 'commentatorIds' || key === 'videoFile') {
                        // todo: atm no schedule importer knows commentator IDs, but this needs improved if that becomes possible
                        return objValue;
                    }
                    // If the schedule item title hasn't changed, assume any existing Twitch categories are still valid.
                    // This way we can avoid refreshing Twitch categories too much
                    if (key === 'twitchCategory') {
                        if (obj.title === src.title) {
                            return objValue;
                        } else {
                            return null;
                        }
                    }
                    // The default method of merging arrays creates bad results
                    if (Array.isArray(srcValue) && Array.isArray(objValue)) {
                        return srcValue;
                    }
                    return undefined;
                }));
            }
        });

        this.logger.info(`Merged new schedule (New items: ${newScheduleItemCount}; Updated items: ${updatedScheduleItemCount}; Total items: ${newItems.length})`);
        return newItems;
    }
}
