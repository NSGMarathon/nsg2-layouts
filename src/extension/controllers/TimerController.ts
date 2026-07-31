import { BaseController } from './BaseController';
import type NodeCG from '@nodecg/types';
import type { Configschema } from 'types/schemas';
import { TimerService } from '../services/TimerService';

export class TimerController extends BaseController {
    constructor(nodecg: NodeCG.ServerAPI<Configschema>, timerService: TimerService) {
        super(nodecg);

        this.listen('timer:pause', () => {
            timerService.pause();
        });
        this.listen('timer:reset', () => {
            timerService.reset();
        });
        this.listen('timer:start', () => {
            timerService.start();
        });
        this.listen('timer:stop', data => {
            timerService.stop(data?.teamId, data?.forfeit);
        });
        this.listen('timer:undoStop', data => {
            timerService.undoStop(data?.teamId);
        });
    }
}
