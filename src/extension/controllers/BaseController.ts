import type NodeCG from '@nodecg/types';
import type { MessageInputMap, MessageResultMap } from 'types/messages';

export abstract class BaseController {
    private readonly nodecg: NodeCG.ServerAPI;

    protected constructor(nodecg: NodeCG.ServerAPI) {
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
                this.nodecg.log.error(`Error in ${this.constructor.name}:`, String(e));
                this.nodecg.log.debug(`Error in ${this.constructor.name}:`, e);
                if (cb && !cb.handled) {
                    (cb as NodeCG.UnhandledAcknowledgement)(e);
                }
            }
        });
    }
}
