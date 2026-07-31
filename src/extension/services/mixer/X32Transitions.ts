// Based off companion-module-behringer-x32
// Licensed under the MIT license: https://github.com/bitfocus/companion-module-behringer-x32/blob/82e1a6d63f43a37d9f12938be98ff8241d9497e7/LICENSE

import { MetaArgument, UDPPort } from 'osc';
import { dbToFloat } from './X32Util';
import type NodeCG from '@nodecg/types';
import type { Configschema } from 'types/schemas';
import { MixerService } from './MixerService';

export interface TransitionInfo {
    steps: number[]
}

type EasingAlgorithm = 'linear' | 'in' | 'out';

function easeIn(number: number): number {
    return number * number;
}

function easeOut(number: number): number {
    return number * (2 - number);
}

export class X32Transitions {
    private readonly transitions: Map<string, TransitionInfo>;
    private readonly fps: number;
    private readonly osc: UDPPort | null = null;

    private tickInterval: NodeJS.Timeout | undefined;

    constructor(nodecg: NodeCG.ServerAPI<Configschema>) {
        this.transitions = new Map();
        this.fps = nodecg.bundleConfig.x32?.transitionFps ?? 10;
        if (MixerService.hasRequiredConfig(nodecg)) {
            this.osc = new UDPPort({
                localAddress: '0.0.0.0',
                localPort: 0,
                broadcast: true,
                metadata: true,
                remoteAddress: nodecg.bundleConfig.x32!.address!,
                remotePort: 10023
            });
            this.osc.open();
        }
    }

    private sendOsc(cmd: string, arg: MetaArgument): void {
        // HACK: We send commands on a different port than we run /xremote on, so that we get change events for what we send.
        // Otherwise we can have no confirmation that a command was accepted
        if (this.osc != null) {
            this.osc.send({ address: cmd, args: arg });
        }
    }

    public stopAll(): void {
        this.transitions.clear();

        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            delete this.tickInterval;
        }
    }

    private runTick(): void {
        const completedPaths: string[] = [];
        for (const [path, info] of this.transitions.entries()) {
            const newValue = info.steps.shift();
            if (newValue !== undefined) {
                this.sendOsc(path, {
                    type: 'f',
                    value: newValue,
                });
            }
            if (info.steps.length === 0) {
                completedPaths.push(path);
            }
        }

        // Remove any completed transitions
        for (const path of completedPaths) {
            this.transitions.delete(path);
        }

        // If nothing is left, stop the timer
        if (this.transitions.size === 0) {
            this.stopAll();
        }
    }

    public runForDb(
        path: string,
        from: number | undefined,
        to: number,
        duration: number,
        easingAlgorithm: EasingAlgorithm
    ): void {
        const floatTo = dbToFloat(to);
        const floatFrom = from != null ? dbToFloat(from) : undefined;
        this.run(path, floatFrom, floatTo, duration, easingAlgorithm);
    }

    public run(
        path: string,
        from: number | undefined,
        to: number,
        duration: number,
        easingAlgorithm: EasingAlgorithm
    ): void {
        const interval = 1000 / this.fps;
        const stepCount = Math.ceil(duration / interval);

        if (stepCount <= 1 || typeof from !== 'number') {
            this.transitions.delete(path);
            this.sendOsc(path, { type: 'f', value: to });
        } else {
            const diff = to - from;
            const steps: number[] = [];

            const easing = this.getEasingFunction(easingAlgorithm);
            for (let i = 1; i <= stepCount; i++) {
                const fraction = easing(i / stepCount);
                steps.push(from + diff * fraction);
            }

            this.transitions.set(path, { steps });

            if (!this.tickInterval) {
                // Start the tick if not already running
                this.tickInterval = setInterval(() => this.runTick(), 1000 / this.fps);
            }
        }
    }

    private getEasingFunction(algorithm: EasingAlgorithm): (number: number) => number {
        switch (algorithm) {
            case 'in':
                return easeIn;
            case 'out':
                return easeOut;
            default:
                return number => number;
        }
    }
}
