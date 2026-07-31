import { BaseController } from './BaseController';
import type NodeCG from '@nodecg/types';
import type { Configschema, CurrentHostId } from 'types/schemas';
import { TalentService } from '../services/TalentService';

export class TalentController extends BaseController {
    constructor(nodecg: NodeCG.ServerAPI<Configschema>, talentService: TalentService) {
        super(nodecg);

        const currentHostId = nodecg.Replicant('currentHostId') as unknown as NodeCG.ServerReplicantWithSchemaDefault<CurrentHostId>;

        this.listen('talent:updateTalentItems', data => {
            talentService.updateTalentItems(data);
        });

        this.listen('talent:setCurrentHost', data => {
            talentService.updateTalentItems([data]);
            currentHostId.value = data.id;
        });

        this.listen('talent:removeCurrentHost', () => {
            currentHostId.value = null;
        });
    }
}
