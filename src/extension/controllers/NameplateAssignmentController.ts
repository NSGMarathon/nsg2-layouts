import { BaseController } from './BaseController';
import type NodeCG from '@nodecg/types';
import type { ActiveSpeedrun, Configschema, PlayerNameplateAssignments } from 'types/schemas';
import { NameplateAssignmentService } from '../services/NameplateAssignmentService';

export class NameplateAssignmentController extends BaseController {
    constructor(nodecg: NodeCG.ServerAPI<Configschema>, nameplateAssignmentService: NameplateAssignmentService) {
        super(nodecg);

        this.listen('nameplate:setActiveRelayPlayer', data => {
            nameplateAssignmentService.setActiveRelayPlayer(data.teamId, data.playerId);
        });
    }
}
