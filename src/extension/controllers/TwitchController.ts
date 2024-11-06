import { BaseController } from './BaseController';
import type NodeCG from '@nodecg/types';
import type { Configschema } from 'types/schemas';
import { TwitchService } from '../services/TwitchService';
import { isBlank } from 'shared/StringHelper';

export class TwitchController extends BaseController {
    constructor(nodecg: NodeCG.ServerAPI<Configschema>, twitchService: TwitchService) {
        super(nodecg);

        this.listen('twitch:logout', () => {
            twitchService.logout();
        });

        this.listen('twitch:findCategory', async (data) => {
            if (isBlank(data.name)) {
                return [];
            }
            return twitchService.findCategory(data.name);
        });

        this.listen('twitch:startCommercial', async (data) => {
            await twitchService.startCommercial(data.length);
        });
    }
}
