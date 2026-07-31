import { BaseController } from './BaseController';
import type NodeCG from '@nodecg/types';
import type { Configschema } from 'types/schemas';

export class LogController extends BaseController {
    constructor(nodecg: NodeCG.ServerAPI<Configschema>) {
        super(nodecg);

        this.listen('log:warning', message => {
            nodecg.log.warn(message);
        });
    }
}
