import type NodeCG from '@nodecg/types';
import { readdir } from 'fs/promises';
import path from 'node:path';
import type { Configschema, VideoFile, VideoFiles } from 'types/schemas';
import { HasNodecgLogger } from '../helpers/HasNodecgLogger';

export class VideoFileService extends HasNodecgLogger {
    private readonly videoFiles: NodeCG.ServerReplicantWithSchemaDefault<VideoFiles>;
    private readonly preRecordedSpeedrunDirectory: string | undefined;
    private readonly interstitialVideoDirectory: string | undefined;

    constructor(nodecg: NodeCG.ServerAPI<Configschema>) {
        super(nodecg);
        this.videoFiles = nodecg.Replicant('videoFiles') as unknown as NodeCG.ServerReplicantWithSchemaDefault<VideoFiles>;
        this.preRecordedSpeedrunDirectory = nodecg.bundleConfig?.videos?.preRecordedSpeedrunDirectory;
        this.interstitialVideoDirectory = nodecg.bundleConfig?.videos?.interstitialVideoDirectory;

        this.loadVideoFilesOfType('speedruns');
        this.loadVideoFilesOfType('interstitials');
    }

    async loadVideoFilesOfType(type: keyof VideoFiles) {
        try {
            this.videoFiles.value[type] = await this.loadVideoFiles(type === 'speedruns' ? this.preRecordedSpeedrunDirectory : this.interstitialVideoDirectory);
        } catch (e) {
            this.logError('Failed to load interstitial videos', e);
            this.videoFiles.value[type] = [];
        }
    }

    private async loadVideoFiles(dir: string | undefined): Promise<VideoFile[]> {
        if (dir == null) {
            return [];
        }

        const dirContents = await readdir(dir);

        return dirContents.map(fileName => ({
            type: 'LOCAL_FILE',
            name: fileName,
            path: path.join(dir, fileName)
        }));
    }
}
