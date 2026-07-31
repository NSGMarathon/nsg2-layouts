import { BaseController } from './BaseController';
import type NodeCG from '@nodecg/types';
import type { Configschema } from 'types/schemas';
import { IgdbService } from '../services/IgdbService';

export class IgdbController extends BaseController {
    constructor(nodecg: NodeCG.ServerAPI<Configschema>, igdbService: IgdbService | null) {
        super(nodecg);

        this.listen('igdb:findGame', async (data) => {
            if (igdbService == null) {
                throw new Error('Twitch configuration is missing');
            }

            return igdbService.searchGames(data.name, false);
        });
    }
}
