import type NodeCG from '@nodecg/types';
import type {
    AllBids,
    AllPrizes,
    Configschema,
    CurrentBids,
    CurrentPrizes,
    DonationTotal,
    Milestones,
    TrackerState
} from 'types/schemas';
import { TrackerClient } from '../clients/TrackerClient';
import { TrackerSocketClient } from '../clients/TrackerSocketClient';
import { HasNodecgLogger } from '../helpers/HasNodecgLogger';
import { AbstractTrackerClient } from '../clients/AbstractTrackerClient';
import { DateTime } from 'luxon';
import { TrackerApiV2Client } from '../clients/TrackerApiV2Client';

export class TrackerService extends HasNodecgLogger {
    private readonly nodecg: NodeCG.ServerAPI<Configschema>;
    private readonly trackerClient?: AbstractTrackerClient;
    private readonly trackerSocketClient?: TrackerSocketClient;
    private readonly donationTotal: NodeCG.ServerReplicantWithSchemaDefault<DonationTotal>;
    private readonly allBids: NodeCG.ServerReplicantWithSchemaDefault<AllBids>;
    private readonly currentBids: NodeCG.ServerReplicantWithSchemaDefault<CurrentBids>;
    private readonly allPrizes: NodeCG.ServerReplicantWithSchemaDefault<AllPrizes>;
    private readonly currentPrizes: NodeCG.ServerReplicantWithSchemaDefault<CurrentPrizes>;
    private readonly milestones: NodeCG.ServerReplicantWithSchemaDefault<Milestones>;
    private readonly trackerState: NodeCG.ServerReplicantWithSchemaDefault<TrackerState>;
    private readonly useOldTrackerApi: boolean;
    private donationTotalApiUpdateTimeout: NodeJS.Timeout | undefined = undefined;
    private isFirstLogin = true;

    constructor(nodecg: NodeCG.ServerAPI<Configschema>) {
        super(nodecg);
        this.donationTotal = nodecg.Replicant('donationTotal') as unknown as NodeCG.ServerReplicantWithSchemaDefault<DonationTotal>;
        this.allBids = nodecg.Replicant('allBids') as unknown as NodeCG.ServerReplicantWithSchemaDefault<AllBids>;
        this.currentBids = nodecg.Replicant('currentBids') as unknown as NodeCG.ServerReplicantWithSchemaDefault<CurrentBids>;
        this.allPrizes = nodecg.Replicant('allPrizes') as unknown as NodeCG.ServerReplicantWithSchemaDefault<AllPrizes>;
        this.currentPrizes = nodecg.Replicant('currentPrizes') as unknown as NodeCG.ServerReplicantWithSchemaDefault<CurrentPrizes>;
        this.milestones = nodecg.Replicant('milestones') as unknown as NodeCG.ServerReplicantWithSchemaDefault<Milestones>;
        this.trackerState = nodecg.Replicant('trackerState', { persistent: false }) as unknown as NodeCG.ServerReplicantWithSchemaDefault<TrackerState>;
        this.useOldTrackerApi = nodecg.bundleConfig.tracker?.useOldTrackerApi ?? false;
        this.nodecg = nodecg;

        if (!AbstractTrackerClient.hasRequiredTrackerConfig(nodecg)) {
            this.logger.warn('Some GDQ tracker configuration is missing!');
        } else {
            this.trackerClient = this.useOldTrackerApi ? new TrackerClient(nodecg) : new TrackerApiV2Client(nodecg);

            if (TrackerClient.hasTrackerLogin(nodecg)) {
                this.doLoginLoop();
            } else if (this.trackerClient.canLogin()) {
                this.logger.warn('GDQ tracker login info is not configured. Some privileged data will not be retrieved from the tracker.');
            }

            this.updateDonationTotal(true);
            this.pollTrackerData();
        }

        if (!TrackerSocketClient.hasRequiredConfig(nodecg)) {
            this.logger.warn('GDQ tracker socket URL is missing. Donations may take longer to appear on stream.');
        } else {
            this.trackerSocketClient = new TrackerSocketClient(nodecg);
            this.trackerSocketClient.start();
            this.trackerSocketClient.on('donation', this.onDonation.bind(this));
        }
    }

    private async pollTrackerData() {
        if (this.trackerClient == null) return;

        const results = await Promise.allSettled([
            this.trackerClient.getMilestones().then(milestones => { this.milestones.value = milestones; }),
            this.trackerClient.getBids(false).then(currentBids => {
                this.sortBids(currentBids);
                this.currentBids.value = this.mergeLocalValues(currentBids);
            }),
            this.trackerClient.getBids(true).then(allBids => {
                this.sortBids(allBids);
                this.allBids.value = this.mergeLocalValues(allBids);
            }),
            this.trackerClient.getPrizes(false).then(currentPrizes => { this.currentPrizes.value = currentPrizes; }),
            this.trackerClient.getPrizes(true).then(allPrizes => { this.allPrizes.value = allPrizes; })
        ]);

        if (results.some(result => result.status === 'rejected')) {
            this.logger.error('Some GDQ tracker data failed to refresh');
            results.forEach(result => {
                if (result.status === 'rejected') {
                    this.logger.debug('Error refreshing GDQ tracker data:', result.reason);
                }
            });
        }
        setTimeout(this.pollTrackerData.bind(this), 60 * 1000);
    }

    // Pinning bids was removed from the tracker this year (see donation-tracker pull #802)
    // todo: need some kind of ui for modifying these
    private mergeLocalValues(bids: AllBids): AllBids {
        if (this.useOldTrackerApi) {
            return bids;
        }

        return bids.map(newBid => {
            const oldBid = this.allBids.value.find(bid => bid.id === newBid.id);

            return {
                ...newBid,
                pinned: newBid.state === 'OPENED' ? (oldBid?.pinned ?? newBid.pinned) : false
            };
        });
    }

    private sortBids(bids: AllBids) {
        bids.forEach(bid => {
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
        bids.sort((a, b) => {
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
    }

    private onDonation(amount: number, newTotal: number, displayName?: string | null) {
        if (this.donationTotal.value < newTotal) {
            this.donationTotal.value = newTotal;
        }
        this.nodecg.sendMessage('tracker:newDonation', {
            amount,
            displayName
        });
    }

    private async doLoginLoop() {
        if (this.trackerClient?.canLogin()) {
            this.trackerState.value.login = 'LOGGING_IN';
            await this.trackerClient?.login()
                .then(() => {
                    this.trackerState.value.login = 'LOGGED_IN';
                    if (this.isFirstLogin) {
                        this.isFirstLogin = false;
                        this.logger.info('Successfully logged in to GDQ tracker');
                    } else {
                        this.logger.debug('Successfully logged in to GDQ tracker');
                    }
                    setTimeout(this.doLoginLoop.bind(this), 90 * 60 * 1000);
                })
                .catch(e => {
                    this.trackerState.value.login = 'NOT_LOGGED_IN';
                    this.logError('Failed to log in to GDQ tracker', e);
                    if (!this.isFirstLogin) {
                        setTimeout(this.doLoginLoop.bind(this), 60 * 1000);
                    }
                });
        } else {
            // Pretend everything is OK
            this.trackerState.value.login = 'LOGGED_IN';
        }
    }

    private async updateDonationTotal(force = false) {
        try {
            if (this.trackerClient == null) return;
            this.logger.debug('Requesting donation total from tracker');
            const newTotal = await this.trackerClient.getDonationTotal();
            if (force || this.donationTotal.value < newTotal) {
                this.donationTotal.value = newTotal;
            }
        } catch (e) {
            this.logError('Error updating donation total', e);
        } finally {
            this.donationTotalApiUpdateTimeout = setTimeout(this.updateDonationTotal.bind(this), 60 * 1000);
        }
    }
}
