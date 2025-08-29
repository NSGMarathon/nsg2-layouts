import type NodeCG from '@nodecg/types';
import { readdir } from 'fs/promises';
import path from 'node:path';
import type { Configschema, Schedule, VideoFile, VideoFiles } from 'types/schemas';
import { HasNodecgLogger } from '../helpers/HasNodecgLogger';
import { ScheduleService } from './ScheduleService';

export class VideoFileService extends HasNodecgLogger {
    private readonly videoFiles: NodeCG.ServerReplicantWithSchemaDefault<VideoFiles>;
    private readonly preRecordedSpeedrunDirectory: string | undefined;
    private readonly interstitialVideoDirectory: string | undefined;
    private readonly scheduleService: ScheduleService;

    constructor(nodecg: NodeCG.ServerAPI<Configschema>, scheduleService: ScheduleService) {
        super(nodecg);
        this.videoFiles = nodecg.Replicant('videoFiles') as unknown as NodeCG.ServerReplicantWithSchemaDefault<VideoFiles>;
        this.preRecordedSpeedrunDirectory = nodecg.bundleConfig?.videos?.preRecordedSpeedrunDirectory;
        this.interstitialVideoDirectory = nodecg.bundleConfig?.videos?.interstitialVideoDirectory;
        this.scheduleService = scheduleService;

        this.loadVideoFilesOfType('speedruns');
        this.loadVideoFilesOfType('interstitials');
    }

    async loadVideoFilesOfType(type: keyof VideoFiles) {
        try {
            this.videoFiles.value[type] = await this.loadVideoFiles(type === 'speedruns' ? this.preRecordedSpeedrunDirectory : this.interstitialVideoDirectory);
            if (type === 'speedruns') {
                this.checkScheduleVideoFiles();
            }
        } catch (e) {
            this.logError('Failed to load interstitial videos', e);
            this.videoFiles.value[type] = [];
        }
    }

    private checkScheduleVideoFiles() {
        this.scheduleService.schedule.value.items.forEach(scheduleItem => {
            if (
                scheduleItem.type === 'SPEEDRUN'
                && scheduleItem.videoFile != null
                && !this.videoFiles.value.speedruns.some(speedrunVideoFile => scheduleItem.videoFile!.path === speedrunVideoFile.path)
            ) {
                this.logger.warn(`Lost video file for speedrun "${scheduleItem.title} (${scheduleItem.category})"! (Was "${scheduleItem.videoFile.path}")`);
                this.scheduleService.updateScheduleItem({
                    ...scheduleItem,
                    videoFile: null
                });
            }
        });
    }

    private async loadVideoFiles(dir: string | undefined): Promise<VideoFile[]> {
        if (dir == null) {
            return [];
        }

        const dirContents = await readdir(dir);

        return dirContents
            .filter(fileName => !fileName.startsWith('.'))
            .map(fileName => ({
                type: 'LOCAL_FILE',
                name: fileName,
                path: path.join(dir, fileName)
            }));
    }
}
