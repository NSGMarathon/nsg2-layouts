import type NodeCG from '@nodecg/types';
import type { ActiveSpeedrun, Configschema, Speedrun, Timer } from 'types/schemas';
import * as livesplitCore from 'livesplit-core';
import { DateTime, Duration } from 'luxon';
import cloneDeep from 'lodash/cloneDeep';
import { ObsConnectorService } from './ObsConnectorService';
import { ScheduleService } from './ScheduleService';
import { HasNodecgLogger } from '../helpers/HasNodecgLogger';

export class TimerService extends HasNodecgLogger {
    private readonly timerRep: NodeCG.ServerReplicantWithSchemaDefault<Timer>;
    private readonly activeSpeedrun: NodeCG.ServerReplicantWithSchemaDefault<ActiveSpeedrun>;
    private readonly timer: livesplitCore.Timer;
    private readonly obsConnectorService: ObsConnectorService;
    private readonly scheduleService: ScheduleService;

    constructor(nodecg: NodeCG.ServerAPI<Configschema>, obsConnectorService: ObsConnectorService, scheduleService: ScheduleService) {
        super(nodecg);
        this.timerRep = nodecg.Replicant('timer') as unknown as NodeCG.ServerReplicantWithSchemaDefault<Timer>;
        this.activeSpeedrun = nodecg.Replicant('activeSpeedrun') as unknown as NodeCG.ServerReplicantWithSchemaDefault<ActiveSpeedrun>;
        this.obsConnectorService = obsConnectorService;
        this.scheduleService = scheduleService;
        const run = livesplitCore.Run.new();
        run.pushSegment(livesplitCore.Segment.new('done!'));

        this.timer = livesplitCore.Timer.new(run)!;
        this.initGameTime();
        if (this.timerRep.value.state === 'RUNNING') {
            const missedTime = Date.now() - this.timerRep.value.time.timestamp;
            const previousTime = this.timerRep.value.time.rawTime;
            const timeOffset = previousTime + missedTime;
            this.logger.info(`Recovered ${(missedTime / 1000).toFixed(2)} seconds of lost time`);
            this.start(true);
            livesplitCore.TimeSpan.fromSeconds(timeOffset / 1000).with(t => this.timer.setGameTime(t));
        }

        setInterval(this.tick.bind(this), 100);

        obsConnectorService.addProgramSceneChangeListener(sceneName => {
            if (
                this.activeSpeedrun.value != null
                && this.activeSpeedrun.value?.timerStartTime == null
                && this.timerRep.value.state === 'RUNNING'
                && obsConnectorService.isGameplayScene(sceneName)
            ) {
                // The timer starting during intermission is usually assumed to just be a test, perhaps
                // we're just demonstrating to the runner how to start the timer. If it's still running
                // as we switch out of intermission, we'll assign the start time just to have some
                // value there.

                this.setLastStartTime();
            }
        });
    }

    private setLastStartTime() {
        this.scheduleService.updateScheduleItem({
            ...this.activeSpeedrun.value,
            timerStartTime: this.timerRep.value.lastStartTime
        } as Speedrun);
    }

    start(force = false) {
        if (this.timerRep.value.state === 'FINISHED') {
            throw new Error('Cannot resume finished timer');
        }
        if (!force && !['STOPPED', 'PAUSED'].includes(this.timerRep.value.state)) {
            throw new Error('Timer must be stopped or paused');
        }

        this.timerRep.value.state = 'RUNNING';
        this.timerRep.value.lastStartTime = DateTime.utc().toISO();
        if (this.timer.currentPhase() === 0) {
            this.timer.start();
        } else {
            this.timer.resume();
        }
        this.initGameTime();

        if (this.obsConnectorService.gameplaySceneInProgram() && this.activeSpeedrun.value != null && this.activeSpeedrun.value.timerStartTime == null) {
            this.setLastStartTime();
        }
    }

    stop(teamId?: string, forfeit?: boolean) {
        if (!['RUNNING', 'PAUSED'].includes(this.timerRep.value.state)) {
            throw new Error('Timer must be running or paused');
        }
        const teamCount = this.activeSpeedrun.value?.teams.length ?? 0;
        if (teamId == null && this.activeSpeedrun.value != null && teamCount > 1) {
            throw new Error('Active speedrun has more than one team, but team to stop timer for was not provided');
        }
        if (teamId != null && this.timerRep.value.teamResults[teamId] != null) {
            throw new Error('Team timer is already stopped');
        }


        if (teamId != null || teamCount === 1) {
            if (teamCount === 1) {
                teamId = this.activeSpeedrun.value!.teams[0].id;
            }
            this.timerRep.value.teamResults[teamId!] = {
                state: forfeit ? 'FORFEIT' : 'FINISHED',
                time: cloneDeep(this.timerRep.value.time)
            };
        }

        const finishedTeamCount = Object.keys(this.timerRep.value.teamResults).length;
        if (finishedTeamCount >= teamCount) {
            if (this.timerRep.value.state === 'PAUSED') {
                this.timer.resume();
            }
            this.timer.split();
            this.timerRep.value.state = 'FINISHED';
        }
    }

    // todo: doesn't work properly if nodecg is restarted after the timer is finished
    undoStop(teamId?: string) {
        if (!['FINISHED', 'RUNNING', 'PAUSED'].includes(this.timerRep.value.state)) {
            throw new Error('Timer must not be stopped');
        }
        const teamCount = this.activeSpeedrun.value?.teams.length ?? 0;
        if (teamId == null && this.activeSpeedrun.value != null && teamCount > 1) {
            throw new Error('Active speedrun has more than one team, but team to undo stop for was not provided');
        }

        if (teamId != null || teamCount === 1) {
            if (teamCount === 1) {
                teamId = this.activeSpeedrun.value!.teams[0].id;
            }
            delete this.timerRep.value.teamResults[teamId!];
        }

        if (this.timerRep.value.state === 'FINISHED') {
            if (this.timer.currentPhase() === 0) {
                this.timer.start();
                livesplitCore.TimeSpan.fromSeconds(this.timerRep.value.time.rawTime / 1000).with(t => this.timer.setGameTime(t));
            } else {
                this.timer.undoSplit();
            }
            this.timerRep.value.state = 'RUNNING';
        }
    }

    pause() {
        if (this.timerRep.value.state !== 'RUNNING') {
            throw new Error('Timer must be running');
        }

        this.timer.pause();
        this.timerRep.value.state = 'PAUSED';
    }

    reset() {
        if (this.timerRep.value.state === 'STOPPED') return;

        this.timer.reset(false);
        this.timerRep.value = {
            state: 'STOPPED',
            lastStartTime: this.timerRep.value.lastStartTime,
            time: {
                hours: 0,
                minutes: 0,
                seconds: 0,
                milliseconds: 0,
                timestamp: 0,
                rawTime: 0
            },
            teamResults: {}
        };
    }

    isActive() {
        return ['RUNNING', 'PAUSED'].includes(this.timerRep.value.state);
    }

    private tick() {
        if (this.timerRep.value.state !== 'RUNNING') return;

        const gameTime = this.timer.currentTime().gameTime();
        if (gameTime == null) return;
        const millis = gameTime.totalSeconds() * 1000;
        this.timerRep.value.time = {
            ...Duration.fromMillis(millis).shiftTo('hours', 'minutes', 'seconds', 'milliseconds').toObject() as { hours: number, minutes: number, seconds: number, milliseconds: number },
            rawTime: millis,
            timestamp: Date.now()
        };
    }

    private initGameTime() {
        livesplitCore.TimeSpan.fromSeconds(0).with(t => this.timer.setLoadingTimes(t));
        this.timer.initializeGameTime();
        const existingSeconds = this.timerRep.value.time.rawTime / 1000;
        livesplitCore.TimeSpan.fromSeconds(existingSeconds).with(t => this.timer.setGameTime(t));
    }
}
