import NodeCG from '@nodecg/types';

export function createLogger(classInstance: Object, nodecg: NodeCG.ServerAPI): NodeCG.Logger {
    return new nodecg.Logger(`${nodecg.bundleName}:${classInstance.constructor.name}`);
}
