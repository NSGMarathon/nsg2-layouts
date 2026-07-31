import { BaseController } from './BaseController';
import type NodeCG from '@nodecg/types';
import type { Configschema } from 'types/schemas';
import { OengusService } from '../services/OengusService';

export class OengusController extends BaseController {
    constructor(nodecg: NodeCG.ServerAPI<Configschema>, oengusService: OengusService) {
        super(nodecg);

        this.listen('oengus:login', async (data) => {
            await oengusService.login(data.username, data.password, data.twoFactorCode);
        });
    }
}
