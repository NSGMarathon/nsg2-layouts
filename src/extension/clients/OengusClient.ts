import { type AxiosInstance, isAxiosError } from 'axios';
import axios from 'axios';
import { type Configschema, OengusData, OtherScheduleItem, Schedule, Speedrun, Talent } from 'types/schemas';
import type NodeCG from '@nodecg/types';
import { generateUserAgent } from '../helpers/GenerateUserAgent';
import { Duration } from 'luxon';
import { HasNodecgLogger } from '../helpers/HasNodecgLogger';

type OengusRunType = 'SINGLE' | 'RACE' | 'COOP' | 'COOP_RACE' | 'OTHER' | 'RELAY' | 'RELAY_RACE';
type OengusSocialPlatform = 'DISCORD' | 'EMAIL' | 'FACEBOOK' | 'INSTAGRAM' | 'NICO' | 'SNAPCHAT' | 'SPEEDRUNCOM' | 'TWITCH' | 'TWITTER' | 'MASTODON' | 'YOUTUBE';

interface OengusLoginResponse {
    status: 'MFA_REQUIRED' | 'MFA_INVALID' | 'LOGIN_SUCCESS' | 'ACCOUNT_DISABLED' | 'USERNAME_PASSWORD_INCORRECT' | 'OAUTH_ACCOUNT_NOT_FOUND'
    token: string | null
}

interface OengusSocialAccount {
    id: number
    username: string
    platform: OengusSocialPlatform
}

interface OengusV1UserProfile {
    id: number
    emailVerified: boolean
    username: string
    displayName: string
    enabled: boolean
    connections: OengusSocialAccount[]
    history: unknown[]
    moderatedMarathons: unknown[]
    volunteeringHistory: unknown[]
    pronouns: string[]
    languagesSpoken: string[]
    banned: boolean
    country: string
    usernameJapanese: string
    twitterName: string
    discordName: string
    twitchName: string
    speedruncomName: string
}

interface OengusV1ScheduleLine {
    id: number
    gameName: string | null
    console: string | null
    emulated: boolean
    ratio: string | null
    categoryName: string | null
    categoryId: number | null
    estimate: string
    setupTime: string
    setupBlock: boolean
    customRun: boolean
    position: number
    type: OengusRunType
    runners: OengusV1UserProfile[]
    setupBlockText: string | null
    customData: string | null
    date: string
    time: string | null
    effectiveSetupTime: string
}

interface OengusV1ScheduleResponse {
    id: number
    lines: OengusV1ScheduleLine[]
}

interface OengusV2ScheduleListResponse {
    data: {
        id: number
        marathonId: string
        name: string | null
        slug: string | null
        published: boolean
    }[]
}

interface OengusV2BasicUserInfo {
    id: number
    username: string
    displayName: string
    enabled: boolean
    pronouns: string[]
    languagesSpoken: string[]
    banned: boolean
    country: string
    connections: OengusSocialAccount[]
}

interface OengusV2LineRunner {
    runnerName?: string
    profile?: OengusV2BasicUserInfo
}

interface OengusV2ScheduleLine {
    id: number
    game: string
    console: string
    emulated: boolean
    ratio: string
    type: OengusRunType
    runners: OengusV2LineRunner[]
    category: string
    estimate: string
    setupTime: string
    position: number
    customRun: boolean
    setupBlock: boolean
    setupBlockText: string
    customData: string
    date: string
    categoryId: number
}

interface OengusV2CachelessScheduleResponse {
    data: OengusV2ScheduleLine[]
}

interface OengusV2ScheduleResponse {
    name: string
    slug: string
    id: number
    marathonId: string
    published: boolean
    lines: OengusV2ScheduleLine[]
}

interface OengusV1MarathonInfoResponse {
    id: string
    name: string
    startDate: string
    endDate: string
    submissionsStartDate: string
    submissionsEndDate: string
    description: string
}

export class OengusClient extends HasNodecgLogger {
    private readonly axios: AxiosInstance;
    private readonly oengusData: NodeCG.ServerReplicantWithSchemaDefault<OengusData>;

    constructor(nodecg: NodeCG.ServerAPI<Configschema>) {
        super(nodecg);
        this.axios = axios.create({
            baseURL: (nodecg.bundleConfig.oengus?.useSandbox ?? false) ? 'https://sandbox.oengus.io/api' : 'https://oengus.io/api',
            headers: {
                'User-Agent': generateUserAgent(nodecg),
                Accept: 'application/json',
                'oengus-version': '2'
            }
        });
        this.oengusData = nodecg.Replicant('oengusData') as unknown as NodeCG.ServerReplicantWithSchemaDefault<OengusData>;
        this.axios.interceptors.request.use((config) => {
            if (config.url !== '/v2/auth/login' && this.oengusData.value.token != null) {
                config.headers.Authorization = `Bearer ${this.oengusData.value.token}`;
            }
            return config;
        });
    }

    private async getMarathonInfoV1(marathonSlug: string): Promise<OengusV1MarathonInfoResponse> {
        const response = await this.axios.get<OengusV1MarathonInfoResponse>(`/v1/marathons/${marathonSlug}`);
        return response.data;
    }

    private getRunnerExternalIdV1(scheduleLineId: number, runnerName: string | undefined, runnerIndex: number): string {
        return `runner-${scheduleLineId}-${runnerName || runnerIndex}`;
    }

    private getRunnerExternalIdV2(scheduleLineId: number, runners: OengusV2LineRunner[], lineRunner: OengusV2LineRunner, runnerIndex: number): string {
        if (lineRunner.profile == null) {
            if (runners.filter(runner => runner.runnerName != null && runner.runnerName === lineRunner.runnerName).length > 1) {
                return `runner-${scheduleLineId}-${lineRunner.runnerName}-${runnerIndex}`;
            } else {
                return `runner-${scheduleLineId}-${lineRunner.runnerName}`;
            }
        } else {
            return String(lineRunner.profile.id);
        }
    }

    // Place every player on the same team for co-op and relay runs
    // For races we can't predict team placements so everybody gets their own team initially
    private getTeamListV1(scheduleLine: OengusV1ScheduleLine): Speedrun['teams'] {
        if (scheduleLine.type === 'RELAY' || scheduleLine.type === 'COOP') {
            return [
                {
                    id: '',
                    playerIds: scheduleLine.runners.map((runner, i) => ({
                        externalId: runner.id === -1 ? this.getRunnerExternalIdV1(scheduleLine.id, runner.displayName, i) : String(runner.id),
                        id: ''
                    }))
                }
            ];
        } else {
            return scheduleLine.runners.map((runner, i) => ({
                id: '',
                playerIds: [{
                    externalId: runner.id === -1 ? this.getRunnerExternalIdV1(scheduleLine.id, runner.displayName, i) : String(runner.id),
                    id: ''
                }]
            }))
        }
    }

    private getTeamListV2(scheduleLine: OengusV2ScheduleLine): Speedrun['teams'] {
        if (scheduleLine.type === 'RELAY' || scheduleLine.type === 'COOP') {
            return [
                {
                    id: '',
                    playerIds: scheduleLine.runners.map((runner, i) => ({
                        externalId: this.getRunnerExternalIdV2(scheduleLine.id, scheduleLine.runners, runner, i),
                        id: ''
                    }))
                }
            ];
        } else {
            return scheduleLine.runners.map((runner, i) => ({
                id: '',
                playerIds: [{
                    externalId: this.getRunnerExternalIdV2(scheduleLine.id, scheduleLine.runners, runner, i),
                    id: ''
                }]
            }))
        }
    }

    private findSocialUsername(connections: OengusSocialAccount[] | undefined, platform: OengusSocialPlatform): string | null {
        return connections == null ? null : connections.find(connection => connection.platform === platform)?.username ?? null;
    }

    // ['he/him', 'they/them'] -> 'he/they', etc.
    private mergePronouns(pronouns?: string[]): string | null {
        if (pronouns == null || pronouns.length === 0) return null;
        if (pronouns.length === 1) return pronouns[0];

        const firstPronouns = [];
        for (let i = 0; i < pronouns.length; i++) {
            const splitPronouns = pronouns[i].split('/');
            if (splitPronouns.length !== 2) {
                this.logger.warn(`Couldn't make sense of these pronouns: ${pronouns[i]}`);
                return pronouns.join(', ');
            }
            firstPronouns.push(splitPronouns[0]);
        }
        return firstPronouns.join('/');
    }

    private async getScheduleV1(marathonId: string): Promise<{ schedule: Schedule, talent: Talent }> {
        const marathonInfo = await this.getMarathonInfoV1(marathonId);
        const scheduleResponse = await this.axios.get<OengusV1ScheduleResponse>(`/v1/marathons/${marathonId}/schedule?withCustomData=true`);

        const scheduleItems: Schedule['items'] = scheduleResponse.data.lines.map(line => {
            if (line.setupBlock) {
                return {
                    id: '',
                    externalId: String(line.id),
                    title: line.setupBlockText || 'Setup Block',
                    type: 'SETUP',
                    estimate: Duration.fromISO(line.estimate).plus(Duration.fromISO(line.setupTime)).toISO() as string,
                    setupTime: Duration.fromObject({ seconds: 0 }).toISO(),
                    scheduledStartTime: line.date,
                    talentIds: []
                } satisfies OtherScheduleItem;
            } else if (line.type === 'OTHER') {
                return {
                    id: '',
                    externalId: String(line.id),
                    type: 'OTHER',
                    title: line.gameName || `Item #${line.position} (Untitled)`,
                    estimate: line.estimate,
                    setupTime: line.setupTime,
                    scheduledStartTime: line.date,
                    talentIds: line.runners.map((runner, i) => ({
                        id: '',
                        externalId: runner.id === -1 ? this.getRunnerExternalIdV1(line.id, runner.displayName, i) : String(runner.id)
                    }))
                } satisfies OtherScheduleItem;
            } else {
                return {
                    id: '',
                    externalId: String(line.id),
                    type: 'SPEEDRUN',
                    title: line.gameName || `Run #${line.position} (Untitled)`,
                    estimate: line.estimate,
                    setupTime: line.setupTime,
                    scheduledStartTime: line.date,
                    system: line.console,
                    category: line.categoryName,
                    relay: line.type.includes('RELAY'),
                    teams: this.getTeamListV1(line),
                    commentatorIds: [],
                    emulated: line.emulated,
                    timerMode: 'TIMER_COUNTUP'
                } satisfies Speedrun;
            }
        });

        const existingRunnerIdSet = new Set();
        const talent: Talent = [];
        scheduleResponse.data.lines.forEach(line => {
            line.runners.forEach((runner, i) => {
                if (existingRunnerIdSet.has(String(runner.id))) {
                    return;
                }

                const talentItem: Talent[number] = {
                    id: '',
                    externalId: runner.id === -1 ? this.getRunnerExternalIdV1(line.id, runner.displayName, i) : String(runner.id),
                    name: runner.displayName,
                    pronouns: this.mergePronouns(runner.pronouns),
                    countryCode: runner.country,
                    socials: {
                        twitch: this.findSocialUsername(runner.connections, 'TWITCH'),
                        youtube: this.findSocialUsername(runner.connections, 'YOUTUBE'),
                        twitter: this.findSocialUsername(runner.connections, 'TWITTER'),
                        speedruncom: this.findSocialUsername(runner.connections, 'SPEEDRUNCOM')
                    }
                };

                existingRunnerIdSet.add(talentItem.externalId);
                talent.push(talentItem);
            });
        });

        return {
            schedule: {
                id: marathonId,
                source: 'OENGUS',
                startTime: marathonInfo.startDate,
                items: scheduleItems
            },
            talent
        };
    }

    private async getScheduleLinesV2(marathonId: string, scheduleSlug: string, scheduleId: number): Promise<OengusV2ScheduleLine[]> {
        if (this.oengusData.value.token != null) {
            try {
                const privateScheduleResponse = await this.axios.get<OengusV2CachelessScheduleResponse>(`/v2/marathons/${marathonId}/schedules/${scheduleId}/manage/lines`);
                this.logger.debug('Got Oengus schedule without cache');
                return privateScheduleResponse.data.data;
            } catch (e) {
                // I'm not entirely positive why Oengus sends us a 404 error here, but retrying with the public endpoint
                // has a chance of returning a positive result.
                if (isAxiosError(e) && (e.response?.status === 401 || e.response?.status === 404)) {
                    this.logger.warn(`Tried to fetch Oengus schedule without cache, but got a ${e.response?.status} error: ${this.formatError(e)}`);
                } else {
                    throw e;
                }
            }
        }

        const scheduleResponse = await this.axios.get<OengusV2ScheduleResponse>(`/v2/marathons/${marathonId}/schedules/for-slug/${scheduleSlug}?withCustomData=true`);
        this.logger.debug('Got Oengus schedule with cache');
        return scheduleResponse.data.lines;
    }

    private async getScheduleV2(marathonId: string, scheduleSlug: string, scheduleId: number): Promise<{ schedule: Schedule, talent: Talent }> {
        const marathonInfo = await this.getMarathonInfoV1(marathonId);
        const scheduleResponse = await this.getScheduleLinesV2(marathonId, scheduleSlug, scheduleId);

        const scheduleItems: Schedule['items'] = scheduleResponse.map(line => {
            if (line.setupBlock) {
                return {
                    id: '',
                    externalId: String(line.id),
                    title: line.setupBlockText || 'Setup Block',
                    description: line.category || null,
                    type: 'SETUP',
                    estimate: line.estimate,
                    setupTime: line.setupTime,
                    scheduledStartTime: line.date,
                    talentIds: []
                } satisfies OtherScheduleItem;
            } else if (line.type === 'OTHER') {
                return {
                    id: '',
                    externalId: String(line.id),
                    type: 'OTHER',
                    title: line.game || `Item #${line.position} (Untitled)`,
                    description: line.category || null,
                    estimate: line.estimate,
                    setupTime: line.setupTime,
                    scheduledStartTime: line.date,
                    talentIds: line.runners.map((runner, i) => ({
                        id: '',
                        externalId: this.getRunnerExternalIdV2(line.id, line.runners, runner, i)
                    }))
                } satisfies OtherScheduleItem;
            } else {
                return {
                    id: '',
                    externalId: String(line.id),
                    type: 'SPEEDRUN',
                    title: line.game?.trim() || `Run #${line.position} (Untitled)`,
                    estimate: line.estimate,
                    setupTime: line.setupTime,
                    scheduledStartTime: line.date,
                    system: line.console,
                    category: line.category,
                    relay: line.type.includes('RELAY'),
                    teams: this.getTeamListV2(line),
                    commentatorIds: [],
                    emulated: line.emulated,
                    timerMode: 'TIMER_COUNTUP'
                } satisfies Speedrun;
            }
        });

        const existingRunnerIdSet = new Set();
        const talent: Talent = [];
        scheduleResponse.forEach(line => {
            line.runners.forEach((runner, i) => {
                const externalId = this.getRunnerExternalIdV2(line.id, line.runners, runner, i);
                if (existingRunnerIdSet.has(externalId)) {
                    return;
                }

                const talentItem: Talent[number] = {
                    id: '',
                    externalId,
                    name: runner.profile?.displayName ?? runner.runnerName ?? 'Unnamed Runner',
                    pronouns: this.mergePronouns(runner.profile?.pronouns),
                    countryCode: runner.profile?.country,
                    socials: {
                        twitch: this.findSocialUsername(runner.profile?.connections, 'TWITCH'),
                        youtube: this.findSocialUsername(runner.profile?.connections, 'YOUTUBE'),
                        twitter: this.findSocialUsername(runner.profile?.connections, 'TWITTER'),
                        speedruncom: this.findSocialUsername(runner.profile?.connections, 'SPEEDRUNCOM')
                    }
                };

                existingRunnerIdSet.add(talentItem.externalId);
                talent.push(talentItem);
            });
        });

        return {
            schedule: {
                id: marathonId,
                source: 'OENGUS',
                startTime: marathonInfo.startDate,
                items: scheduleItems
            },
            talent
        };
    }

    async getScheduleAndTalent(marathonSlug: string): Promise<{ schedule: Schedule, talent: Talent }> {
        const scheduleListResponse = await this.axios.get<OengusV2ScheduleListResponse>(`/v2/marathons/${marathonSlug}/schedules`);

        if (scheduleListResponse.data.data.length === 0) {
            throw new Error('Oengus marathon has no schedules?');
        }

        const firstSchedule = scheduleListResponse.data.data[0];
        if (firstSchedule.slug == null) {
            this.logger.debug('Found Oengus event with legacy schedules');
            return this.getScheduleV1(marathonSlug);
        }
        if (scheduleListResponse.data.data.length > 1) {
            this.logger.warn(`Oengus marathon has more than one schedule, which is not fully supported. Using schedule "${firstSchedule.name ?? firstSchedule.slug}".`);
        }
        return this.getScheduleV2(marathonSlug, firstSchedule.slug, firstSchedule.id);
    }

    async login(username: string, password: string, twoFactorCode?: string): Promise<string | null> {
        try {
            const response = await this.axios.post<OengusLoginResponse>('/v2/auth/login', {
                username,
                password,
                twoFactorCode
            });
            if (response.data.token == null) {
                throw new Error(`Oengus login failed with state ${response.data.status}`);
            }
            return response.data.token;
        } catch (e) {
            if (isAxiosError(e) && e.response?.data != null && 'status' in e.response.data) {
                throw new Error(`Oengus login failed with status ${e.response.data.status}`);
            }

            throw e;
        }
    }

    async refreshToken(): Promise<string | null> {
        if (this.oengusData.value.token == null) {
            throw new Error('No access token present to refresh');
        }
        try {
            const response = await this.axios.post<OengusLoginResponse>('/v2/auth/refresh-token');
            if (response.data.token == null) {
                throw new Error(`Oengus token refresh failed with status ${response.data.status}`);
            }
            return response.data.token;
        } catch (e) {
            if (isAxiosError(e) && e.response?.data != null && 'status' in e.response.data) {
                throw new Error(`Oengus token refresh failed with status ${e.response.data.status}`);
            }

            throw e;
        }
    }
}
