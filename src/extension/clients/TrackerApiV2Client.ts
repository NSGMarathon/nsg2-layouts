import { AbstractTrackerClient } from './AbstractTrackerClient';
import axios, { AxiosInstance, isAxiosError } from 'axios';
import  NodeCG from '@nodecg/types';
import type { AllBids, AllPrizes, Configschema, Milestones, PrizeStartEndRun } from 'types/schemas';
import { generateUserAgent } from '../helpers/GenerateUserAgent';
import { DateTime } from 'luxon';
import { isBlank } from 'shared/StringHelper';

interface TrackerApiV2PaginationResponse<ResultType> {
    count: number
    next: string | null
    previous: string | null
    results: ResultType[]
}

type TrackerBidState = 'PENDING' | 'DENIED' | 'HIDDEN' | 'OPENED' | 'CLOSED';

interface TrackerApiV2Run {
    readonly type: 'speedrun'
    readonly id: number
    name: string
    display_name: string
    twitch_name: string
    description: string
    category: string | null
    coop: boolean
    onsite: 'ONSITE' | 'ONLINE' | 'HYBRID'
    console: string
    release_year: number | null
    runners: TrackerApiV2Talent[]
    hosts: TrackerApiV2Talent[]
    commentators: TrackerApiV2Talent[]
    order: number | null
    tech_notes?: string
    layout: string
    video_links: object[]
    priority_tag: null | string
    tags: string[]
    starttime: null | string
    endtime: null | string
    run_time: string
    setup_time: string
    anchor_time: null | string
}

interface TrackerApiV2Talent {
    readonly type: 'talent' | 'runner'
    readonly id: number
    name: string
    stream: string
    twitter: string
    youtube: string
    platform: string
    pronouns: string
}

interface TrackerApiV2BaseBid {
    readonly id: number
    readonly type: 'bid'
    readonly bid_type: 'challenge' | 'choice' | 'option'
    name: string
    full_name: string
    readonly event: number
    readonly speedrun: null | number
    readonly parent: null | number
    state: TrackerBidState
    description: string
    shortdescription: string
    estimate: null | string
    close_at: null | string
    post_run: boolean
    goal: null | number | string
    chain: boolean
    readonly chain_goal?: number
    readonly chain_remaining?: number
    readonly total: number
    readonly count: number
    repeat: null | number
    accepted_number?: number
    istarget: boolean
    allowuseroptions?: boolean
    option_max_length?: null | number
    pinned?: boolean
    readonly revealedtime: null | string
}

interface TrackerApiV2TreeBid extends Omit<TrackerApiV2BaseBid, 'event' | 'repeat' | 'parent'> {
    event?: number
    repeat?: number | null
    options?: TrackerApiV2BidChild[]
}

interface TrackerApiV2BidChild extends Omit<TrackerApiV2BaseBid, 'event' | 'speedrun' | 'parent' | 'chain' | 'allowuseroptions' | 'close_at' | 'post_run' | 'repeat' | 'goal' | 'pinned'> {
    readonly bid_type: 'choice' | 'option'
    options?: TrackerApiV2BidChild[]
}

interface TrackerApiV2Event {
    readonly type: 'event'
    readonly id: number
    short: string
    name: string
    amount: number
    donation_count: number
    paypalcurrency: number
    hashtag: string
    datetime: string
    timezone: string
    use_one_step_screening: boolean
}

interface TrackerApiV2Milestone {
    readonly type: 'milestone'
    readonly id: number
    start: string | number
    amount: string | number
    name: string
    run: number | null
    visible: boolean
    description: string
    short_description: string
}

type PrizeState = 'ACCEPTED' | 'PENDING' | 'DENIED' | 'FLAGGED';

type PrizeLifecycle =
    | 'pending'
    | 'notify_contributor'
    | 'denied'
    | 'accepted'
    | 'ready'
    | 'drawn'
    | 'winner_notified'
    | 'claimed'
    | 'accept_email_sent'
    | 'needs_shipping'
    | 'shipped'
    | 'completed';

interface TrackerApiV2Prize {
    readonly type: 'prize'
    readonly id: number
    name: string
    state: PrizeState
    startrun: null | number
    endrun: null | number
    starttime: null | string
    endtime: null | string
    start_draw_time: null | string
    end_draw_time: null | string
    description: string
    shortdescription: string
    image: string
    altimage: string
    imagefile: null | string
    estimatedvalue: null | number
    minimumbid: number
    sumdonations: boolean
    provider: string
    creator: null | string
    creatorwebsite: null | string
    lifecycle?: PrizeLifecycle
}

export class TrackerApiV2Client extends AbstractTrackerClient {
    private readonly axios: AxiosInstance;
    private readonly eventId: number;
    private readonly address: string;
    private runCache: Map<number, TrackerApiV2Run> = new Map();
    private lastRunCacheRefreshTime: DateTime | null = null;

    constructor(nodecg: NodeCG.ServerAPI<Configschema>) {
        if (!AbstractTrackerClient.hasRequiredTrackerConfig(nodecg)) {
            throw new Error('GDQ tracker config is missing');
        }
        super(nodecg);

        this.eventId = nodecg.bundleConfig.tracker!.eventId!;
        this.address = nodecg.bundleConfig.tracker!.address!;
        this.axios = axios.create({
            baseURL: nodecg.bundleConfig.tracker!.address + '/tracker/api/v2',
            headers: {
                'User-Agent': generateUserAgent(nodecg),
                Accept: 'application/json'
            }
        });
    }

    private async refreshRunCache(force = false): Promise<void> {
        if (!force && this.lastRunCacheRefreshTime != null && this.lastRunCacheRefreshTime.diffNow('minutes').minutes < 1) {
            return;
        }

        this.lastRunCacheRefreshTime = DateTime.utc();
        const response = await this.axios.get<TrackerApiV2PaginationResponse<TrackerApiV2Run>>(`/events/${this.eventId}/runs/`);

        // yeah i couldn't find any event that exceeded these limits
        if (response.data.next != null) {
            this.logger.warn('Got more than 1 full page of runs!!! This may cause issues.');
        }

        response.data.results.forEach(run => {
            this.runCache.set(run.id, run);
        });
    }

    async getBids(getAll: boolean): Promise<AllBids> {
        await this.refreshRunCache();

        const response = await this.axios.get<TrackerApiV2PaginationResponse<TrackerApiV2TreeBid>>(
            `/events/${this.eventId}/bids/tree/`,
            { params: { state: getAll ? undefined : 'OPENED' } });

        if (response.data.next != null) {
            this.logger.error('Got more than 1 full page of bids!!! The list of bids will be incomplete.');
        }

        let cacheRefreshForced = false;
        return Promise.all(response.data.results.map(async (bid) => {
            let run = bid.speedrun == null ? null : this.runCache.get(bid.speedrun);

            if (!cacheRefreshForced && bid.speedrun != null && run == null) {
                await this.refreshRunCache(true);
                run = this.runCache.get(bid.speedrun);
                cacheRefreshForced = true;
            }

            if (run == null && bid.speedrun != null) {
                this.logger.warn(`Failed to get information for tracker run #${bid.speedrun}`);
            }

            return {
                id: bid.id,
                name: bid.name,
                description: bid.shortdescription || bid.description,
                total: typeof bid.total === 'string' ? parseFloat(bid.total) : bid.total ?? 0,
                goal: typeof bid.goal === 'string' ? parseFloat(bid.goal) : bid.goal,
                state: bid.state,
                speedrunEndTime: run?.endtime,
                speedrunName: run?.name,
                userOptionsAllowed: bid.allowuseroptions,
                pinned: bid.pinned,
                options: bid.options?.map(option => ({
                    id: option.id,
                    name: option.name,
                    description: option.shortdescription || option.description,
                    total: typeof option.total === 'string' ? parseFloat(option.total) : option.total ?? 0,
                }))
            };
        }));
    }

    async getMilestones(): Promise<Milestones> {
        const response = await this.axios.get<TrackerApiV2PaginationResponse<TrackerApiV2Milestone>>(`/events/${this.eventId}/milestones/`);

        if (response.data.next != null) {
            this.logger.error('Got more than 1 full page of milestones!!! The list of milestones will be incomplete.');
        }

        return response.data.results.map(milestone => ({
            id: milestone.id,
            start: typeof milestone.start === 'string' ? parseFloat(milestone.start) : milestone.start,
            amount: typeof milestone.amount === 'string' ? parseFloat(milestone.amount) : milestone.amount,
            name: milestone.name,
            description: milestone.description,
            shortDescription: milestone.short_description,
        }));
    }

    async getPrizes(getAll: boolean): Promise<AllPrizes> {
        await this.refreshRunCache();

        try {
            const response = await this.axios.get<TrackerApiV2PaginationResponse<TrackerApiV2Prize>>(
                `/events/${this.eventId}/prizes/feed_${getAll ? 'public' : 'current'}/`);

            if (response.data.next != null) {
                this.logger.error('Got more than 1 full page of prizes!!! The list of prizes will be incomplete.');
            }

            let cacheRefreshForced = false;
            return Promise.all(response.data.results.map(async (prize) => {
                if (!cacheRefreshForced && prize.startrun != null && !this.runCache.has(prize.startrun) || prize.endrun != null && !this.runCache.has(prize.endrun)) {
                    cacheRefreshForced = true;
                    await this.refreshRunCache(true);
                }

                const startRun = prize.startrun == null ? null : this.runCache.get(prize.startrun);
                const endRun = prize.endrun == null ? null : this.runCache.get(prize.endrun);

                if (startRun == null && prize.startrun != null || endRun == null && prize.endrun != null) {
                    this.logger.warn(`Failed to get information for prize start and/or end runs (#${prize.startrun ?? '?'} & #${prize.endrun ?? '?'})`);
                }

                return {
                    id: prize.id,
                    name: prize.name,
                    image: this.getPrizeImage(prize),
                    minimumBid: prize.minimumbid,
                    sumDonations: prize.sumdonations ?? false,
                    provider: prize.provider || undefined,
                    startTime: prize.starttime || undefined,
                    endTime: prize.endtime || undefined,
                    startDrawTime: prize.start_draw_time || undefined,
                    endDrawTime: prize.end_draw_time || undefined,
                    startRun: this.toPrizeStartEndRun(startRun),
                    endRun: this.toPrizeStartEndRun(endRun)
                } satisfies AllPrizes[number];
            }))
        } catch (e) {
            // I'm currently working with a tracker instance which is missing the endpoint for prizes.
            // I wanted the error to be a little more concise in that case.
            if (isAxiosError(e) && e.response?.status === 404) {
                this.logger.warn('The configured donation tracker does not support fetching prizes from the new API.');
                return [];
            }

            throw e;
        }
    }

    private toPrizeStartEndRun(run: TrackerApiV2Run | null | undefined): PrizeStartEndRun | undefined {
        return run == null ? undefined : {
            id: run.id,
            name: run.name,
            displayName: run.display_name,
            order: run.order
        };
    }

    private getPrizeImage(item: TrackerApiV2Prize) {
        if (!isBlank(item.altimage)) {
            return item.altimage!;
        } else if (!isBlank(item.imagefile)) {
            return item.imagefile!.startsWith('/') ? this.address + item.imagefile : item.imagefile!;
        } else {
            return item.image ?? undefined;
        }
    }

    async getDonationTotal(): Promise<number> {
        const eventData = await this.axios.get<TrackerApiV2Event>(`/events/${this.eventId}/?totals=true`);
        return eventData.data.amount;
    }
}
