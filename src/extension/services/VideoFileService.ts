import type NodeCG from '@nodecg/types';
import { readdir } from 'fs/promises';
import path from 'node:path';
import type { Configschema, VideoFile, VideoFiles } from 'types/schemas';
import { HasNodecgLogger } from '../helpers/HasNodecgLogger';

export class VideoFileService extends HasNodecgLogger {
    private readonly videoFiles: NodeCG.ServerReplicantWithSchemaDefault<VideoFiles>;
    private readonly preRecordedSpeedrunDirectory: string | undefined;

    constructor(nodecg: NodeCG.ServerAPI<Configschema>) {
        super(nodecg);
        this.videoFiles = nodecg.Replicant('videoFiles') as unknown as NodeCG.ServerReplicantWithSchemaDefault<VideoFiles>;
        this.preRecordedSpeedrunDirectory = nodecg.bundleConfig?.videos?.preRecordedSpeedrunDirectory;

        this.loadSpeedruns();
    }

    async loadSpeedruns() {
        try {
            this.videoFiles.value.speedruns = await this.loadVideoFiles(this.preRecordedSpeedrunDirectory);
        } catch (e) {
            this.logger.error('Failed to load pre-recorded speedruns:', e);
            this.videoFiles.value.speedruns = [];
        }
    }

    private async loadVideoFiles(dir: string | undefined): Promise<VideoFile[]> {
        if (dir == null) {
            throw new Error('Video file path is not configured.');
        }

        const dirContents = await readdir(dir);

        return dirContents.map(fileName => ({
            type: 'LOCAL_FILE',
            name: fileName,
            path: path.join(dir, fileName)
        }));
    }
}
