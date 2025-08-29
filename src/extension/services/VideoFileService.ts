import type NodeCG from '@nodecg/types';
import { readdir } from 'fs/promises';
import path from 'node:path';
import type { Configschema, VideoFile, VideoFiles } from 'types/schemas';
import { HasNodecgLogger } from '../helpers/HasNodecgLogger';
import { ScheduleService } from './ScheduleService';
import { DateTime } from 'luxon';

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

    setInterstitialLastPlayed(file: VideoFile) {
        const videoFileIndex = this.videoFiles.value.interstitials.findIndex(otherFile => file.path === otherFile.path);
        if (videoFileIndex !== -1) {
            this.videoFiles.value.interstitials[videoFileIndex] = {
                ...this.videoFiles.value.interstitials[videoFileIndex],
                lastPlayed: DateTime.utc().toISO()
            };
        }
    }

    async loadVideoFilesOfType(type: keyof VideoFiles) {
        try {
            if (type === 'speedruns') {
                this.videoFiles.value.speedruns = await this.loadVideoFiles(this.preRecordedSpeedrunDirectory);
                this.checkScheduleVideoFiles();
            } else {
                const interstitialVideos = await this.loadVideoFiles(this.interstitialVideoDirectory);
                this.videoFiles.value.interstitials = interstitialVideos.map(video => ({
                    ...video,
                    lastPlayed: this.videoFiles.value.interstitials.find(otherVideo => video.path === otherVideo.path)?.lastPlayed
                }));
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
