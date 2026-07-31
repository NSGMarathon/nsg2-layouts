import type NodeCG from '@nodecg/types';
import type { AllBids, AllPrizes, Configschema, Milestones } from 'types/schemas';
import { HasNodecgLogger } from '../helpers/HasNodecgLogger';

export abstract class AbstractTrackerClient extends HasNodecgLogger {

    abstract getMilestones(): Promise<Milestones>;

    abstract getBids(getAll: boolean): Promise<AllBids>;

    abstract getPrizes(getAll: boolean): Promise<AllPrizes>;

    abstract getDonationTotal(): Promise<number>;

    login(): Promise<void> {
        return new Promise((_, reject) => reject(new Error('Logging in is not supported on this instance of AbstractTrackerClient')));
    }

    canLogin(): boolean {
        return false;
    }

    static hasRequiredTrackerConfig(nodecg: NodeCG.ServerAPI<Configschema>): boolean {
        const trackerConfig = nodecg.bundleConfig.tracker;
        if (trackerConfig == null) return false;
        return [
            trackerConfig.address,
            trackerConfig.eventId
        ].every(configItem => configItem != null);
    }
}
