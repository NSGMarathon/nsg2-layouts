import type NodeCG from '@nodecg/types';
import type {
    ActiveGameLayouts,
    ActiveSpeedrun,
    Configschema,
    NextSpeedrun,
    Schedule
} from 'types/schemas';
import cloneDeep from 'lodash/cloneDeep';
import { ScheduleService } from './ScheduleService';
import { ScheduleItem } from 'types/ScheduleHelpers';
import { TimerService } from './TimerService';
import { Layout, layouts } from 'types/Layouts';
import { ObsConnectorService } from './ObsConnectorService';
import { DateTime } from 'luxon';

export class SpeedrunService {
    private readonly schedule: NodeCG.ServerReplicantWithSchemaDefault<Schedule>;
    private readonly activeSpeedrun: NodeCG.ServerReplicantWithSchemaDefault<ActiveSpeedrun>;
    private readonly nextSpeedrun: NodeCG.ServerReplicantWithSchemaDefault<NextSpeedrun>;
    private readonly activeGameLayouts: NodeCG.ServerReplicantWithSchemaDefault<ActiveGameLayouts>;
    private readonly scheduleService: ScheduleService;
    private readonly timerService: TimerService;

    constructor(nodecg: NodeCG.ServerAPI<Configschema>, scheduleService: ScheduleService, timerService: TimerService, obsConnectorService: ObsConnectorService) {
        this.schedule = nodecg.Replicant('schedule') as unknown as NodeCG.ServerReplicantWithSchemaDefault<Schedule>;
        this.activeSpeedrun = nodecg.Replicant('activeSpeedrun') as unknown as NodeCG.ServerReplicantWithSchemaDefault<ActiveSpeedrun>;
        this.nextSpeedrun = nodecg.Replicant('nextSpeedrun') as unknown as NodeCG.ServerReplicantWithSchemaDefault<NextSpeedrun>;
        this.activeGameLayouts = nodecg.Replicant('activeGameLayouts') as unknown as NodeCG.ServerReplicantWithSchemaDefault<ActiveGameLayouts>;
        this.scheduleService = scheduleService;
        this.timerService = timerService;

        this.schedule.on('change', newValue => {
            if (newValue.items.length === 0) return;

            if (this.activeSpeedrun.value == null) {
                const firstSpeedrun = newValue.items.find(scheduleItem => scheduleItem.type === 'SPEEDRUN');
                if (firstSpeedrun != null) {
                    this.setActiveSpeedrun(firstSpeedrun);
                }
            }

            const newNextRun = this.scheduleService.findScheduleItemAfter(this.activeSpeedrun.value?.id, 'SPEEDRUN');
            if (newNextRun == null || this.nextSpeedrun.value == null || newNextRun.id !== this.nextSpeedrun.value.id) {
                this.setNextSpeedrun(newNextRun);
            }
        });

        obsConnectorService.addProgramSceneChangeListener(sceneName => {
            if (this.activeSpeedrun.value != null && this.activeSpeedrun.value.firstGameplayTransitionTime == null && obsConnectorService.isGameplayScene(sceneName)) {
                this.scheduleService.updateScheduleItem({
                    ...this.activeSpeedrun.value,
                    firstGameplayTransitionTime: DateTime.utc().toISO()
                });
            }
        });
    }

    seekToNextRun() {
        if (this.nextSpeedrun.value == null) {
            throw new Error('Cannot determine next run to seek to');
        }
        if (this.timerService.isActive()) {
            throw new Error('Cannot seek runs while timer is running');
        }

        const newNextRun = this.scheduleService.findScheduleItemAfter(this.nextSpeedrun.value.id, 'SPEEDRUN');
        this.setActiveSpeedrun(this.nextSpeedrun.value);
        this.setNextSpeedrun(newNextRun);
    }

    seekToPreviousRun() {
        const previousRun = this.scheduleService.findScheduleItemBefore(this.activeSpeedrun.value?.id, 'SPEEDRUN');
        if (previousRun == null) {
            throw new Error('Cannot determine previous run to seek to');
        }
        if (this.timerService.isActive()) {
            throw new Error('Cannot seek runs while timer is running');
        }

        this.setNextSpeedrun(this.activeSpeedrun.value);
        this.setActiveSpeedrun(previousRun);
    }

    setActiveSpeedrunById(scheduleItemId: string) {
        const scheduleItem = this.schedule.value.items.find(scheduleItem => scheduleItem.id === scheduleItemId);
        if (scheduleItem == null) {
            throw new Error(`No schedule item found with ID ${scheduleItemId}`);
        }
        const newNextRun = this.scheduleService.findScheduleItemAfter(scheduleItem.id, 'SPEEDRUN');
        this.setActiveSpeedrun(scheduleItem);
        this.setNextSpeedrun(newNextRun);
    }

    updateSpeedruns(scheduleItem: ScheduleItem) {
        if (scheduleItem.id === this.activeSpeedrun.value?.id) {
            this.setActiveSpeedrun(scheduleItem);
        } else if (scheduleItem.id === this.nextSpeedrun.value?.id) {
            this.setNextSpeedrun(scheduleItem);
        }
    }

    private setActiveSpeedrun(scheduleItem: ScheduleItem) {
        if (scheduleItem.type !== 'SPEEDRUN') {
            throw new Error(`Schedule item is type "${scheduleItem.type}"; Expected "SPEEDRUN"`);
        }
        const activeRunChanging = scheduleItem.id !== this.activeSpeedrun.value?.id;
        if (activeRunChanging) {
            if (this.timerService.isActive()) {
                throw new Error('Cannot change active speedrun while timer is running');
            }

            // Ignore changes to layouts mid-run
            if (scheduleItem.layout != null && (layouts as Record<string, Layout>)[scheduleItem.layout] != null) {
                this.activeGameLayouts.value[0] = scheduleItem.layout;
            }
        }
        this.activeSpeedrun.value = cloneDeep(scheduleItem);
        if (activeRunChanging) {
            this.timerService.reset();
        }
    }

    private setNextSpeedrun(scheduleItem: ScheduleItem | null) {
        if (scheduleItem != null && scheduleItem.type !== 'SPEEDRUN') {
            throw new Error(`Schedule item is type "${scheduleItem.type}"; Expected "SPEEDRUN"`);
        }
        if (this.timerService.isActive() && scheduleItem?.id !== this.nextSpeedrun.value?.id) {
            throw new Error('Cannot change next speedrun while timer is running');
        }
        this.nextSpeedrun.value = cloneDeep(scheduleItem);
    }
}
