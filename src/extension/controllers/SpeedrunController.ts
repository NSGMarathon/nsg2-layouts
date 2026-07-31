import { BaseController } from './BaseController';
import type NodeCG from '@nodecg/types';
import type { Configschema } from 'types/schemas';
import { SpeedrunService } from '../services/SpeedrunService';

export class SpeedrunController extends BaseController {
    constructor(nodecg: NodeCG.ServerAPI<Configschema>, speedrunService: SpeedrunService) {
        super(nodecg);

        this.listen('speedrun:seekToNextRun', () => {
            speedrunService.seekToNextRun();
        });

        this.listen('speedrun:seekToPreviousRun', () => {
            speedrunService.seekToPreviousRun();
        });

        this.listen('speedrun:setActiveSpeedrun', data => {
             speedrunService.setActiveSpeedrunById(data.scheduleItemId);
        });
    }
}
