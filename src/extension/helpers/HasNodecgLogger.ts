import type NodeCG from '@nodecg/types';
import { Configschema } from 'types/schemas';
import { createLogger } from './LogHelper';

export abstract class HasNodecgLogger {
    protected readonly logger: NodeCG.Logger;
    private readonly usingDebugLogging: boolean;

    protected constructor(nodecg: NodeCG.ServerAPI<Configschema>) {
        this.logger = createLogger(this, nodecg);
        this.usingDebugLogging =
            nodecg.config.logging.console.level === 'debug'
            || nodecg.config.logging.console.level === 'verbose'
            || nodecg.config.logging.file.level === 'debug'
            || nodecg.config.logging.file.level === 'verbose';
    }

    protected logError(message: string, error: unknown) {
        if (this.usingDebugLogging) {
            this.logger.error(message + ':', error);
        } else {
            this.logger.error(message + ':', typeof error === 'object' && error != null && 'message' in error ? error.message : String(error));
        }
    }
}
