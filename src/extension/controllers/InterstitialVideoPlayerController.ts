import { BaseController } from './BaseController';
import type NodeCG from '@nodecg/types';
import type { Configschema } from 'types/schemas';
import { InterstitialVideoPlayerService } from '../services/InterstitialVideoPlayerService';

export class InterstitialVideoPlayerController extends BaseController {
    constructor(nodecg: NodeCG.ServerAPI<Configschema>, interstitialVideoPlayerService: InterstitialVideoPlayerService) {
        super(nodecg);

        this.listen('videos:playInterstitial', data => interstitialVideoPlayerService.play(data.file, data.returnToScene));
    }
}
