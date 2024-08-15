import { BaseController } from './BaseController';
import type NodeCG from '@nodecg/types';
import type { Configschema, ObsConnectionInfo, ObsState } from 'types/schemas';
import { ObsConnectorService } from '../services/ObsConnectorService';

export class ObsConnectorController extends BaseController {
    constructor(nodecg: NodeCG.ServerAPI<Configschema>, obsConnectorService: ObsConnectorService) {
        super(nodecg);

        const obsConnectionInfo = nodecg.Replicant('obsConnectionInfo') as unknown as NodeCG.ServerReplicantWithSchemaDefault<ObsConnectionInfo>;
        const obsState = nodecg.Replicant('obsState') as unknown as NodeCG.ServerReplicantWithSchemaDefault<ObsState>;

        this.listen('obs:connect', async (data) => {
            obsConnectionInfo.value = data;

            if (!obsState.value.enabled) {
                throw new Error('OBS websocket is disabled');
            }

            obsConnectorService.stopReconnecting();
            await obsConnectorService.connect();
        });

        this.listen('obs:setEnabled', async (data) => {
            obsState.value.enabled = data.enabled;
            if (!data.enabled) {
                await obsConnectorService.disconnect();
            } else {
                await obsConnectorService.connect();
            }
        });

        this.listen('obs:setConfig', async (data) => {
            if (
                obsState.value.scenes == null
                || [data.videoInputsScene, data.gameLayoutVideoFeedsScene].some(newScene => !obsState.value.scenes!.some(scene => scene === newScene))
            ) {
                throw new Error('Could not find one or more of the provided scenes');
            }

            await obsConnectorService.setConfig(data);
        });
    }
}