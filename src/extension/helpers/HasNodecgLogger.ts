import type NodeCG from '@nodecg/types';
import { Configschema } from 'types/schemas';
import { createLogger } from '../helpers/LogHelper';

export abstract class HasNodecgLogger {
    protected readonly logger: NodeCG.Logger;

    protected constructor(nodecg: NodeCG.ServerAPI<Configschema>) {
        this.logger = createLogger(this, nodecg);
    }
}
