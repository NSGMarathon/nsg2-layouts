import type NodeCG from '@nodecg/types';
import type { MessageInputMap, MessageResultMap } from 'types/messages';
import { HasNodecgLogger } from '../helpers/HasNodecgLogger';

export abstract class BaseController extends HasNodecgLogger {
    private readonly nodecg: NodeCG.ServerAPI;

    protected constructor(nodecg: NodeCG.ServerAPI) {
        super(nodecg);
        this.nodecg = nodecg;
    }

    listen<K extends keyof MessageInputMap, D = MessageInputMap[K]>(
        messageName: K,
        callback: (data: D) => MessageResultMap[K] | Promise<MessageResultMap[K]>
    ): void {
        this.nodecg.listenFor(messageName, async (data: D, cb?: NodeCG.Acknowledgement) => {
            try {
                const result = await callback(data);
                if (cb && !cb.handled) {
                    (cb as NodeCG.UnhandledAcknowledgement)(null, result);
                }
            } catch (e) {
                this.logger.error(typeof e === 'object' && e != null && 'message' in e ? e.message : String(e));
                this.logger.debug(e);
                if (cb && !cb.handled) {
                    (cb as NodeCG.UnhandledAcknowledgement)(e);
                }
            }
        });
    }
}
