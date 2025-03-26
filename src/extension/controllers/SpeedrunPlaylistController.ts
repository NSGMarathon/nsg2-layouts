import { BaseController } from './BaseController';
import type NodeCG from '@nodecg/types';
import type { Configschema } from 'types/schemas';
import { SpeedrunPlaylistService } from '../services/SpeedrunPlaylistService';

export class SpeedrunPlaylistController extends BaseController {
    constructor(nodecg: NodeCG.ServerAPI<Configschema>, speedrunPlaylistService: SpeedrunPlaylistService) {
        super(nodecg);

        this.listen('speedrunPlaylist:play', () => {
            return speedrunPlaylistService.play();
        });

        this.listen('speedrunPlaylist:stop', () => {
            return speedrunPlaylistService.stop();
        })
    }
}
