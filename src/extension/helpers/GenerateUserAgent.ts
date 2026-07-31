import type NodeCG from '@nodecg/types/types';

export function generateUserAgent(nodecg: NodeCG.ServerAPI): string {
    return `${nodecg.bundleName}/${nodecg.bundleVersion}`;
}
