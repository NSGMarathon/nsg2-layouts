import { BaseController } from './BaseController';
import type NodeCG from '@nodecg/types';
import type { Configschema } from 'types/schemas';
import { VideoFileService } from '../services/VideoFileService';

export class VideoFileController extends BaseController {
    constructor(nodecg: NodeCG.ServerAPI<Configschema>, videoFileService: VideoFileService) {
        super(nodecg);

        this.listen('videos:loadSpeedruns', async () => videoFileService.loadSpeedruns());
    }
}
