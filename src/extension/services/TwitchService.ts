import type NodeCG from '@nodecg/types';
import type { ActiveSpeedrun, Configschema, Schedule, Talent, TwitchCommercialState, TwitchData } from 'types/schemas';
import { TwitchOauthClient } from '../clients/TwitchOauthClient';
import { TwitchClient } from '../clients/TwitchClient';
import { TalentService } from './TalentService';
import { ScheduleItem, TalentItem } from 'types/ScheduleHelpers';
import { ScheduleService } from './ScheduleService';
import { findActiveScheduleItem } from '../helpers/ScheduleHelpers';
import isEqual from 'lodash/isEqual';
import { DateTime } from 'luxon';
import { HasNodecgLogger } from '../helpers/HasNodecgLogger';

const TWITCH_STREAM_TITLE_LENGTH_CAP = 140;
const DEFAULT_TWITCH_CATEGORY = 'Special Events';

export class TwitchService extends HasNodecgLogger {
    private readonly twitchCommercialState: NodeCG.ServerReplicantWithSchemaDefault<TwitchCommercialState>;
    private readonly twitchData: NodeCG.ServerReplicantWithSchemaDefault<TwitchData>;
    private readonly activeSpeedrun: NodeCG.ServerReplicantWithSchemaDefault<ActiveSpeedrun>;
    private readonly schedule: NodeCG.ServerReplicantWithSchemaDefault<Schedule>;
    private readonly talent: NodeCG.ServerReplicantWithSchemaDefault<Talent>;
    private readonly nodecg: NodeCG.ServerAPI<Configschema>;
    private readonly twitchClient: TwitchClient | null;
    private readonly talentService: TalentService;
    private readonly scheduleService: ScheduleService;
    private readonly twitchConfig?: Configschema['twitch'];
    private defaultGameId: string | null = null;

    constructor(
        nodecg: NodeCG.ServerAPI<Configschema>,
        twitchOauthClient: TwitchOauthClient | null,
        twitchClient: TwitchClient | null,
        talentService: TalentService,
        scheduleService: ScheduleService
    ) {
        super(nodecg);
        const router = nodecg.Router();
        this.nodecg = nodecg;
        this.twitchCommercialState = nodecg.Replicant('twitchCommercialState') as unknown as NodeCG.ServerReplicantWithSchemaDefault<TwitchCommercialState>;
        this.twitchData = nodecg.Replicant('twitchData') as unknown as NodeCG.ServerReplicantWithSchemaDefault<TwitchData>;
        this.activeSpeedrun = nodecg.Replicant('activeSpeedrun') as unknown as NodeCG.ServerReplicantWithSchemaDefault<ActiveSpeedrun>;
        this.schedule = nodecg.Replicant('schedule') as unknown as NodeCG.ServerReplicantWithSchemaDefault<Schedule>;
        this.talent = nodecg.Replicant('talent') as unknown as NodeCG.ServerReplicantWithSchemaDefault<Talent>;
        this.twitchClient = twitchClient;
        this.talentService = talentService;
        this.scheduleService = scheduleService;
        this.twitchConfig = nodecg.bundleConfig.twitch;

        if (twitchOauthClient == null) {
            this.logger.warn('Twitch API configuration is missing. Logging in to Twitch will not be possible.');
        }

        router.get('/twitch-auth', async (req, res) => {
            if (twitchOauthClient == null) {
                res.status(200).send('<script>window.close();</script>');
                return;
            }
            if (req.query.error) {
                this.logger.error('Received Twitch callback with error:', req.query.error_description ?? req.query.error);
                res.status(200).send('<script>window.close();</script>');
                return;
            }
            if (req.query.code == null || typeof req.query.code !== 'string') {
                this.logger.error('Received Twitch callback without code');
                res.status(200).send('<script>window.close();</script>');
                return;
            }

            try {
                await twitchOauthClient.getToken(req.query.code);
                if (this.shouldUpdateTitle()) {
                    await this.setStreamInfo(this.scheduleService.findActiveScheduleItem());
                }
            } catch (e) {
                this.logger.error('Error retrieving access token from Twitch', e);
            } finally {
                res.status(200).send('<script>window.close();</script>');
            }
        });

        nodecg.mount(`/${nodecg.bundleName}`, router);

        let isLaunch = true;
        // Handles toggling sync on
        this.twitchData.on('change', async (newValue, oldValue) => {
            if (newValue.state === 'NOT_LOGGED_IN') {
                isLaunch = false;
            } else if (newValue.state === 'LOGGED_IN' && isLaunch) {
                isLaunch = false;
                if (this.shouldUpdateTitle()) {
                    await this.setStreamInfo(this.scheduleService.findActiveScheduleItem());
                }
            }
            if (!oldValue || !this.shouldUpdateTitle()) return;
            if (!oldValue.syncEnabled && newValue.syncEnabled) {
                await this.setStreamInfo(this.scheduleService.findActiveScheduleItem());
            }
        });
        // Handles switching from one speedrun to the next
        this.activeSpeedrun.on('change', async (newValue, oldValue) => {
            if (oldValue == null || !this.shouldUpdateTitle()) return;
            if (newValue == null || newValue.id !== oldValue.id) {
                await this.setStreamInfo(this.scheduleService.findActiveScheduleItem());
            }
        });
        // Handles schedule items changing or interstitials being completed
        this.schedule.on('change', async (newValue, oldValue) => {
            if (oldValue == null || !this.shouldUpdateTitle()) return;
            const oldActiveScheduleItem = findActiveScheduleItem(oldValue.items, this.activeSpeedrun.value?.id);
            const newActiveScheduleItem = findActiveScheduleItem(newValue.items, this.activeSpeedrun.value?.id);
            const getValuesUsedForStreamTitle = (item: ScheduleItem | null) => {
                if (item == null) {
                    return null;
                }
                if (item.type === 'SPEEDRUN') {
                    return {
                        id: item.id,
                        title: item.title,
                        category: item.category,
                        twitchCategory: item.twitchCategory,
                        teams: item.teams.map(team => team.playerIds.map(playerId => this.talentService.findTalentItemById(playerId.id)?.name))
                    };
                } else {
                    return {
                        id: item.id,
                        title: item.title,
                        twitchCategory: item.twitchCategory,
                        talentIds: item.talentIds.map(talentId => this.talentService.findTalentItemById(talentId.id)?.name)
                    };
                }
            }

            if (!isEqual(getValuesUsedForStreamTitle(newActiveScheduleItem), getValuesUsedForStreamTitle(oldActiveScheduleItem))) {
                await this.setStreamInfo(newActiveScheduleItem);
            }
        });
        // Handles talent being changed
        this.talent.on('change', async (newValue, oldValue) => {
            if (oldValue == null || !this.shouldUpdateTitle()) return;
            const activeScheduleItem = this.scheduleService.findActiveScheduleItem();
            if (activeScheduleItem == null) return;
            const talentIds = activeScheduleItem.type !== 'SPEEDRUN'
                ? activeScheduleItem.talentIds
                : activeScheduleItem.teams.reduce((result, team) => {
                    result.push(...team.playerIds.map(playerId => playerId.id));
                    return result;
                }, [] as string[]);
            const newTalentNames = talentIds.map(talentId => newValue.find(newTalentItem => newTalentItem.id === talentId)?.name);
            const oldTalentNames = talentIds.map(talentId => oldValue.find(oldTalentItem => oldTalentItem.id === talentId)?.name);
            if (!isEqual(newTalentNames, oldTalentNames)) {
                await this.setStreamInfo(activeScheduleItem);
            }
        })
    }

    async setStreamInfo(activeScheduleItem: ScheduleItem | null) {
        try {
            const newTitle = this.getStreamTitle(activeScheduleItem);
            if (newTitle != null) {
                if (newTitle.length > TWITCH_STREAM_TITLE_LENGTH_CAP) {
                    this.nodecg.sendMessage('twitch:generatedTitleTooLong');
                    this.logger.warn('Generated a Twitch title that was too long! It should be manually edited to fit within the character limit.');
                }

                if (activeScheduleItem?.twitchCategory == null && this.defaultGameId == null) {
                    const defaultGameId = await this.twitchClient?.getGameId(DEFAULT_TWITCH_CATEGORY);
                    if (defaultGameId == null) {
                        this.logger.warn(`Failed to retrieve default ID for default Twitch category ("${DEFAULT_TWITCH_CATEGORY}")! This should never happen.`);
                    } else {
                        this.defaultGameId = defaultGameId;
                    }
                }

                await this.twitchClient?.setChannelInfo(newTitle.slice(0, TWITCH_STREAM_TITLE_LENGTH_CAP), activeScheduleItem?.twitchCategory?.id ?? this.defaultGameId ?? '');
                this.logger.debug(`Twitch stream title is now "${newTitle}"`);
            }
        } catch (e) {
            this.logger.error('Failed to update Twitch stream info', e instanceof Error ? e.message : String(e));
            this.logger.debug('Failed to update Twitch stream info', e);
        }
    }

    private shouldUpdateTitle(): boolean {
        return this.twitchData.value.syncEnabled && this.twitchData.value.state !== 'NOT_LOGGED_IN';
    }

    private getStreamTitle(scheduleItem: ScheduleItem | null): string | null {
        const titleTemplates = this.twitchConfig?.titleTemplates;
        if (titleTemplates == null) {
            this.logger.warn('Twitch title templates are not configured!');
            return null;
        }

        if (scheduleItem == null) {
            return titleTemplates.fallback;
        } else if (scheduleItem.type === 'SPEEDRUN') {
            const newTitleTemplate = titleTemplates.race != null && scheduleItem.teams.length > 1 ? titleTemplates.race : titleTemplates.speedrun;

            const newTitle = newTitleTemplate
                .replace('{{talent}}', this.talentService.formatScheduleItemTalentList(scheduleItem))
                .replace('{{category}}', scheduleItem.category?.trim() ?? '???')
                .replace('{{title}}', scheduleItem.title.trim());

            if (newTitle.length > TWITCH_STREAM_TITLE_LENGTH_CAP) {
                let firstTalentItem: TalentItem | null = null;
                let talentCount = 0;
                for (let i = 0; i < scheduleItem.teams.length; i++) {
                    const team = scheduleItem.teams[i];
                    if (firstTalentItem == null) {
                        for (let j = 0; j < team.playerIds.length; j++) {
                            const talentItem = this.talentService.findTalentItemById(team.playerIds[j].id);
                            if (talentItem != null) {
                                firstTalentItem = talentItem;
                                break;
                            }
                        }
                    }
                    talentCount += team.playerIds.length;
                }

                if (firstTalentItem != null) {
                    talentCount--;
                }

                return newTitleTemplate
                    .replace('{{talent}}',
                        firstTalentItem == null
                            ? `${talentCount} player${talentCount === 1 ? '' : 's'}`
                            : `${firstTalentItem.name} & ${talentCount} other${talentCount === 1 ? '' : 's'}`)
                    .replace('{{category}}', scheduleItem.category?.trim() ?? '???')
                    .replace('{{title}}', scheduleItem.title.trim());
            }
            return newTitle;
        } else if (scheduleItem.talentIds.length === 0) {
            return titleTemplates.withoutTalent
                .replace('{{title}}', scheduleItem.title.trim());
        } else {
            return titleTemplates.other
                .replace('{{title}}', scheduleItem.title.trim())
                .replace('{{talent}}', this.talentService.formatScheduleItemTalentList(scheduleItem));
        }
    }

    logout() {
        this.twitchData.value = {
            syncEnabled: this.twitchData.value.syncEnabled,
            state: 'NOT_LOGGED_IN',
            credentials: undefined,
            loggedInUser: undefined
        };
    }

    async findCategory(name: string): Promise<{ id: string, name: string, boxArtUrl: string }[] | undefined> {
        return this.twitchClient?.searchForCategory(name);
    }

    async startCommercial(length: number) {
        if (this.twitchClient == null) return;

        const result = await this.twitchClient.startCommercial(length);

        this.twitchCommercialState.value = {
            endTime: DateTime.now().plus({ seconds: length }).toISO(),
            retryTime: DateTime.now().plus({ seconds: result.retryAfter }).toISO()
        };
    }
}
