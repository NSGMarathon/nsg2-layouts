import type { AxiosInstance } from 'axios';
import type NodeCG from '@nodecg/types';
import type { AllBids, AllPrizes, Configschema, Milestones } from 'types/schemas';
import { generateUserAgent } from '../helpers/GenerateUserAgent';
import axios, { isAxiosError } from 'axios';
import cookie from 'cookie';
import { URLSearchParams } from 'url';
import { isBlank } from 'shared/StringHelper';
import { DateTime } from 'luxon';
import { HasNodecgLogger } from '../helpers/HasNodecgLogger';

interface TrackerEventIndexResponse {
    count: {
        runs: number
        prizes: number
        bids: number
        milestones: number
        donors: number
    }
    agg: {
        count: number
        max: number
        avg: number
        median: number
        target: number
        amount: number
    }
}

interface TrackerMilestoneSearchResponseItem {
    model: 'tracker.milestone'
    pk: number
    fields: {
        event: number
        start?: number | string
        amount: number
        name: string
        visible: boolean
        description: string
        short_description: string
        public: string
    }
}

type TrackerBidState = 'PENDING' | 'DENIED' | 'HIDDEN' | 'OPENED' | 'CLOSED';

interface TrackerPrizeSearchResponseItem {
    model: 'tracker.prize'
    pk: number
    fields: {
        name: string
        category: number | null
        image: string
        altimage: string
        imagefile: string
        description: string
        shortdescription: string
        estimatedvalue: number | null
        minimumbid: number
        sumdonations: boolean
        randomdraw: boolean
        event: number
        startrun: number | null
        endrun: number | null
        starttime: string | null
        endtime: string | null
        maxwinners: number
        maxmultiwin: number
        provider: string
        creator: string | null
        creatoremail: string | null
        creatorwebsite: string | null
        custom_country_filter: boolean
        key_code: boolean
        start_draw_time: string | null
        end_draw_time: string | null
        canonical_url: string
        public: string
        numwinners: number
        allowed_prize_countries: number[]
        disallowed_prize_regions: number[]
        startrun__name?: string
        startrun__display_name?: string
        startrun__starttime?: string
        startrun__endtime?: string
        startrun__order?: number | null
        startrun__canonical_url?: string
        startrun__public?: string
        endrun__name?: string
        endrun__display_name?: string
        endrun__starttime?: string
        endrun__endtime?: string
        endrun__order?: number | null
        endrun__canonical_url?: string
        endrun__public?: string
    }
}

interface TrackerAllBidsSearchResponseItem {
    model: 'tracker.bid'
    pk: number
    fields: {
        name: string
        event: number
        parent: number | null
        speedrun: number | null
        state: TrackerBidState
        description: string
        shortdescription: string
        goal: number | null
        repeat: number | null
        istarget: boolean
        allowuseroptions: boolean
        option_max_length: number | null
        revealedtime: string
        biddependency: number | null
        total: string | number
        count: number
        pinned: boolean
        canonical_url: string
        public: string
        speedrun__name?: string
        speedrun__display_name?: string
        speedrun__twitch_name?: string
        speedrun__starttime?: string
        speedrun__endtime?: string
        speedrun__order?: string
        speedrun__canonical_url?: string
        speedrun__public?: string
        event__short: string
        event__name: string
        event__datetime: string
        event__timezone: string
        event__canonical_url: string
        event__public: string
        parent__name?: string
        parent__state?: TrackerBidState
        parent__goal?: number | null
        parent__allowuseroptions?: boolean
        parent__option_max_length?: number | null
        parent__total?: string | number
        parent__count?: number
        parent__canonical_url?: string
        parent__public?: string
        parent__event__short?: string
        parent__event__name?: string
        parent__event__datetime?: string
        parent__event__timezone?: string
        parent__event__canonical_url?: string
        parent__event__public?: string
    }
}

export class TrackerClient extends HasNodecgLogger {
    private readonly axios: AxiosInstance;
    private readonly username?: string;
    private readonly password?: string;
    private readonly address: string;
    private readonly eventId: number;
    private sessionId?: string;

    constructor(nodecg: NodeCG.ServerAPI<Configschema>) {
        if (!TrackerClient.hasRequiredTrackerConfig(nodecg)) {
            throw new Error('GDQ tracker config is missing');
        }
        super(nodecg);

        this.username = nodecg.bundleConfig.tracker!.username;
        this.password = nodecg.bundleConfig.tracker!.password;
        this.address = nodecg.bundleConfig.tracker!.address!;
        this.eventId = nodecg.bundleConfig.tracker!.eventId!;
        this.axios = axios.create({
            baseURL: nodecg.bundleConfig.tracker!.address,
            headers: {
                'User-Agent': generateUserAgent(nodecg),
                Accept: 'application/json'
            }
        });
        this.axios.interceptors.request.use(config => {
            if (this.sessionId != null) {
                const sessionCookie = cookie.serialize('sessionid', this.sessionId);
                if (Array.isArray(config.headers.Cookie)) {
                    config.headers.Cookie.push(sessionCookie);
                } else if (config.headers.Cookie == null) {
                    config.headers.Cookie = [sessionCookie];
                }
            }
            return config;
        });
    }

    async getBids(getAll: boolean): Promise<AllBids> {
        const params = new URLSearchParams(`?type=allbids&event=${this.eventId}`);
        if (!getAll) {
            params.append('state', 'OPENED');
        }
        const response = await this.axios.get<TrackerAllBidsSearchResponseItem[]>(`/tracker/search?${params.toString()}`);

        const parentBidsById: Record<string, AllBids[number]> = {};
        const rawChildBids: TrackerAllBidsSearchResponseItem[] = [];
        response.data.forEach(bidItem => {
            if (bidItem.fields.parent != null) {
                rawChildBids.push(bidItem);
            } else {
                const formattedBid: AllBids[number] = {
                    id: bidItem.pk,
                    name: bidItem.fields.name,
                    description: bidItem.fields.shortdescription || bidItem.fields.description,
                    total: typeof bidItem.fields.total === 'string' ? parseFloat(bidItem.fields.total) : bidItem.fields.total ?? 0,
                    state: bidItem.fields.state,
                    speedrunEndTime: bidItem.fields.speedrun__endtime,
                    speedrunName: bidItem.fields.speedrun__name,
                    pinned: bidItem.fields.pinned ?? false
                };
                if (bidItem.fields.istarget === false) {
                    formattedBid.options = [];
                    formattedBid.userOptionsAllowed = bidItem.fields.allowuseroptions;
                } else {
                    formattedBid.goal = bidItem.fields.goal == null ? null : typeof bidItem.fields.goal === 'string' ? parseFloat(bidItem.fields.goal) : bidItem.fields.goal;
                }
                parentBidsById[String(bidItem.pk)] = formattedBid;
            }
        });
        rawChildBids.forEach(bidItem => {
            const parent = parentBidsById[String(bidItem.fields.parent)];
            if (parent == null) {
                this.logger.warn(`Child bid (ID ${bidItem.pk}) parent (ID ${bidItem.fields.parent}) could not be found`);
            } else {
                parent.options?.push({
                    id: bidItem.pk,
                    name: bidItem.fields.name,
                    description: bidItem.fields.shortdescription || bidItem.fields.description,
                    total: typeof bidItem.fields.total === 'string' ? parseFloat(bidItem.fields.total) : bidItem.fields.total ?? 0
                });
            }
        });
        const result = Object.values(parentBidsById);
        result.forEach(bid => {
            bid.options?.sort((a, b) => {
                if (a.total > b.total) {
                    return -1;
                } else if (a.total < b.total) {
                    return 1;
                } else {
                    return 0;
                }
            });
        });
        result.sort((a, b) => {
            if (a.speedrunEndTime == null && b.speedrunEndTime == null) {
                return 0;
            }
            if (a.speedrunEndTime == null) {
                return -1;
            }
            if (b.speedrunEndTime == null) {
                return 1;
            }
            const parsedDateA = DateTime.fromISO(a.speedrunEndTime);
            const parsedDateB = DateTime.fromISO(a.speedrunEndTime);
            if (parsedDateA > parsedDateB) {
                return -1;
            }
            if (parsedDateA < parsedDateB) {
                return 1;
            }
            return 0;
        });
        return result;
    }

    async getPrizes(getAll: boolean): Promise<AllPrizes> {
        const params = new URLSearchParams(`?type=prize&event=${this.eventId}`);
        if (!getAll) {
            params.append('feed', 'current');
        }
        const response = await this.axios.get<TrackerPrizeSearchResponseItem[]>(`/tracker/search?${params.toString()}`);
        return response.data.map(prize => ({
            id: prize.pk,
            name: prize.fields.name,
            image: this.getPrizeImage(prize),
            minimumBid: prize.fields.minimumbid,
            sumDonations: prize.fields.sumdonations ?? false,
            provider: prize.fields.provider || undefined,
            startTime: prize.fields.starttime || undefined,
            endTime: prize.fields.endtime || undefined,
            startDrawTime: prize.fields.start_draw_time || undefined,
            endDrawTime: prize.fields.end_draw_time || undefined,
            startRun: prize.fields.startrun == null ? undefined : {
                id: prize.fields.startrun,
                name: prize.fields.startrun__name,
                displayName: prize.fields.startrun__display_name,
                order: prize.fields.startrun__order
            },
            endRun: prize.fields.endrun == null ? undefined : {
                id: prize.fields.endrun,
                name: prize.fields.endrun__name,
                displayName: prize.fields.endrun__display_name,
                order: prize.fields.endrun__order
            }
        }));
    }

    private getPrizeImage(item: TrackerPrizeSearchResponseItem) {
        if (!isBlank(item.fields.altimage)) {
            return item.fields.altimage;
        } else if (!isBlank(item.fields.imagefile)) {
            return item.fields.imagefile.startsWith('/') ? this.address + item.fields.imagefile : item.fields.imagefile;
        } else {
            return item.fields.image;
        }
    }

    async getMilestones(): Promise<Milestones> {
        const response = await this.axios.get<TrackerMilestoneSearchResponseItem[]>(`/tracker/search?type=milestone&event=${this.eventId}`);
        return response.data.map(milestone => ({
            id: milestone.pk,
            start: Number(milestone.fields.start ?? 0),
            amount: milestone.fields.amount,
            name: milestone.fields.name,
            description: milestone.fields.description,
            shortDescription: milestone.fields.short_description,
        }));
    }

    async getDonationTotal(): Promise<number> {
        const eventIndexResponse = await this.axios.get<TrackerEventIndexResponse>(`/tracker/event/${this.eventId}?json`);
        return eventIndexResponse.data.agg.amount;
    }

    async login() {
        const loginPageResponse = await this.axios.get('/admin/login/');
        const csrfToken = this.findCookie('csrftoken', loginPageResponse.headers['set-cookie']);
        // note: POSTing "/admin/login" (note the trailing slash) does NOT give the user a token
        // on successful login. Incredibly strange behavior!
        try {
            const loginResponse = await this.axios.post('/admin/login/', {
                csrfmiddlewaretoken: csrfToken,
                username: this.username,
                password: this.password,
                next: '/admin/'
            }, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Referer: `${this.address}/admin/login/`,
                    Cookie: csrfToken == null ? null : cookie.serialize('csrftoken', csrfToken)
                },
                maxRedirects: 0,
                validateStatus: status => status === 302
            });
            const sessionId = this.findCookie('sessionid', loginResponse.headers['set-cookie']);
            if (sessionId == null) {
                this.logger.error('Tracker login resulted in redirect, but session cookie was not set. Are the tracker username and password correct?');
            } else {
                this.sessionId = sessionId;
            }
        } catch (e) {
            // "Request failed with status code 200" looks really weird
            if (isAxiosError(e) && e.response?.status === 200) {
                throw new Error('Received status code 200 after logging in; expected 302. Are the tracker username and password correct?');
            }
            throw e;
        }
    }

    private findCookie(cookieName: string, setCookieHeader?: string[]): string | undefined {
        return setCookieHeader
            ?.map(cookieHeader => cookie.parse(cookieHeader))
            .find(parsedHeader => Object.keys(parsedHeader).includes(cookieName))
            ?.[cookieName];
    }

    static hasRequiredTrackerConfig(nodecg: NodeCG.ServerAPI<Configschema>): boolean {
        const trackerConfig = nodecg.bundleConfig.tracker;
        if (trackerConfig == null) return false;
        return [
            trackerConfig.address,
            trackerConfig.eventId
        ].every(configItem => configItem != null);
    }

    static hasTrackerLogin(nodecg: NodeCG.ServerAPI<Configschema>): boolean {
        const trackerConfig = nodecg.bundleConfig.tracker;
        if (trackerConfig == null) return false;
        return [
            trackerConfig.username,
            trackerConfig.password
        ].every(configItem => configItem != null);
    }
}
