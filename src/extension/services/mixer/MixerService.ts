import type NodeCG from '@nodecg/types';
import {
    ActiveSpeedrun,
    ChannelItem,
    Configschema,
    MixerState,
    MixerChannelAssignments
} from 'types/schemas';
import { MetaArgument, UDPPort } from 'osc';
import PQueue from 'p-queue';
import range from 'lodash/range';
import debounce from 'lodash/debounce';
import { ObsConnectorService } from '../ObsConnectorService';
import { X32Transitions } from './X32Transitions';
import { dbToFloat, floatToDB } from './X32Util';
import cloneDeep from 'lodash/cloneDeep';
import { HasNodecgLogger } from '../../helpers/HasNodecgLogger';

export class MixerService extends HasNodecgLogger {
    private readonly nodecg: NodeCG.ServerAPI<Configschema>;
    private readonly mixerState: NodeCG.ServerReplicantWithSchemaDefault<MixerState>;
    private readonly mixerChannelAssignments: NodeCG.ServerReplicantWithSchemaDefault<MixerChannelAssignments>;
    private readonly activeSpeedrun: NodeCG.ServerReplicantWithSchemaDefault<ActiveSpeedrun>;
    private readonly localMixerChannelLevels: Map<string, number> = new Map();
    private readonly mixerAddress?: string;
    private osc: UDPPort | null;
    private subscriptionRenewalInterval: NodeJS.Timeout | undefined = undefined;
    private readonly requestQueue: PQueue = new PQueue({
        concurrency: 20,
        timeout: 500,
        throwOnTimeout: true
    });
    private inFlightRequests: Record<string, () => void> = { };
    private readonly oscState: Map<string, MetaArgument[]> = new Map();
    private readonly debouncedUpdateStateReplicant: () => void;
    private readonly debouncedUpdateMixerLevelsReplicant: () => void;
    private readonly transitions: X32Transitions;
    private readonly muteTransitionDuration: number;
    private readonly unmuteTransitionDuration: number;
    private readonly requiredFaders: string[];
    private readonly channelIdToAddressPrefix: string[];
    private assignedChannels: number[] = [];

    constructor(nodecg: NodeCG.ServerAPI<Configschema>, obsConnectorService: ObsConnectorService) {
        super(nodecg);
        this.nodecg = nodecg;
        this.activeSpeedrun = nodecg.Replicant('activeSpeedrun') as unknown as NodeCG.ServerReplicantWithSchemaDefault<ActiveSpeedrun>;
        this.mixerState = nodecg.Replicant('mixerState') as unknown as NodeCG.ServerReplicantWithSchemaDefault<MixerState>;
        this.mixerChannelAssignments = nodecg.Replicant('mixerChannelAssignments') as unknown as NodeCG.ServerReplicantWithSchemaDefault<MixerChannelAssignments>;
        this.unmuteTransitionDuration = nodecg.bundleConfig.x32?.transitionDurations?.unmute ?? 500;
        this.muteTransitionDuration = nodecg.bundleConfig.x32?.transitionDurations?.mute ?? 500;
        this.debouncedUpdateStateReplicant = debounce(
            this.updateStateReplicant, 100, { maxWait: 500, trailing: true, leading: false });
        this.debouncedUpdateMixerLevelsReplicant = debounce(
            this.updateMixerLevelsReplicant, 50, { maxWait: 50, trailing: false, leading: true });
        this.channelIdToAddressPrefix = [
            ...MixerService.getChannelAddresses(''),
            ...MixerService.getAuxInAddresses(''),
            ...MixerService.getFxReturnAddresses(''),
            ...MixerService.getBusAddresses(''),
            ...MixerService.getMatrixAddresses('')
        ];

        this.osc = null;
        if (MixerService.hasRequiredConfig(nodecg)) {
            this.mixerAddress = nodecg.bundleConfig.x32!.address!;
            this.setupSocket();
        } else {
            this.mixerState.value.connectionState = 'NOT_CONNECTED';
            this.logger.warn('Some X32 mixer configuration is missing!');
        }

        this.transitions = new X32Transitions(nodecg);
        const channelMapping = nodecg.bundleConfig.x32?.channelMapping;
        if (channelMapping != null) {
            this.requiredFaders = [
                ...(channelMapping.games ?? []).map(ch => this.channelItemToFaderPath(ch)),
                ...(channelMapping.runners ?? []).map(ch => this.channelItemToFaderPath(ch))
            ];

            obsConnectorService.addProgramSceneChangeListener(sceneName => {
                this.fadeChannels(ObsConnectorService.sceneNameTagPresent('G', sceneName) ? 'in' : 'out', channelMapping.games);
                this.fadeChannels(ObsConnectorService.sceneNameTagPresent('R', sceneName) ? 'in' : 'out', channelMapping.runners);
            });
        } else {
            this.requiredFaders = [];
        }

        this.activeSpeedrun.on('change', (newValue, oldValue) => {
            if (newValue == null || (oldValue != null && newValue.id !== oldValue.id)) {
                this.mixerChannelAssignments.value = {
                    speedrunTeams: { },
                    speedrunTalent: { },
                    host: this.mixerChannelAssignments.value.host,
                    speedrunPlaylist: this.mixerChannelAssignments.value.speedrunPlaylist
                };
                return;
            }
            const speedrunTalentIds = new Set<string>();
            const speedrunTeamIds = new Set<string>();
            newValue.teams.forEach(team => {
                speedrunTeamIds.add(team.id);
                team.playerIds.forEach(playerId => {
                    speedrunTalentIds.add(playerId.id);
                });
            });
            newValue.commentatorIds.forEach(commentatorId => {
                speedrunTalentIds.add(commentatorId.id);
            });
            const newChannelAssignments = cloneDeep(this.mixerChannelAssignments.value);
            Object.keys(newChannelAssignments.speedrunTalent).forEach(talentId => {
                if (!speedrunTalentIds.has(talentId)) {
                    delete newChannelAssignments.speedrunTalent[talentId];
                }
            });
            Object.keys(newChannelAssignments.speedrunTeams).forEach(teamId => {
                if (!speedrunTeamIds.has(teamId)) {
                    delete newChannelAssignments.speedrunTeams[teamId];
                }
            });
            this.mixerChannelAssignments.value = newChannelAssignments;
        });

        this.mixerChannelAssignments.on('change', newValue => {
            const assignedChannels = new Set<number>();
            Object.values(newValue.speedrunTalent).forEach(assignment => {
                assignedChannels.add(assignment.channelId);
            });
            Object.values(newValue.speedrunTeams).forEach(assignment => {
                assignedChannels.add(assignment.channelId);
            });
            if (newValue.host != null) {
                assignedChannels.add(newValue.host.channelId);
            }
            if (newValue.speedrunPlaylist != null) {
                assignedChannels.add(newValue.speedrunPlaylist.channelId);
            }
            this.assignedChannels = Array.from(assignedChannels.values());
        });
    }

    private fadeChannels(direction: 'out' | 'in', channels?: readonly ChannelItem[]) {
        if (channels == null) return;
        channels.forEach(channel => {
            const faderPath = this.channelItemToFaderPath(channel);
            const stateItem = this.oscState.get(faderPath);
            const volumeFrom = stateItem != null && stateItem[0]?.type === 'f' ? stateItem[0].value as number : dbToFloat(0);
            if (direction === 'out') {
                this.transitions.run(faderPath, volumeFrom, 0, this.muteTransitionDuration, 'in');
            } else {
                this.transitions.run(faderPath, volumeFrom, dbToFloat(0), this.unmuteTransitionDuration, 'out');
            }
        });
    }

    private setupSocket() {
        this.mixerState.value.connectionState = 'CONNECTING';

        this.osc = new UDPPort({
            localAddress: '0.0.0.0',
            localPort: 0,
            broadcast: true,
            metadata: true,
            remoteAddress: this.mixerAddress,
            remotePort: 10023
        });
        this.osc.on('error', err => {
            this.logger.error(`X32 socket error: ${err.message}`);
            this.requestQueue.clear();
            this.inFlightRequests = { };
        });
        this.osc.on('close', () => {
            this.logger.warn('X32 connection closed');
            this.mixerState.value.connectionState = 'NOT_CONNECTED';
            clearInterval(this.subscriptionRenewalInterval);
        });
        this.osc.on('ready', () => {
            this.mixerState.value.connectionState = 'CONNECTED';

            this.requestQueue.clear();
            this.inFlightRequests = { };

            this.registerForUpdates();
            clearInterval(this.subscriptionRenewalInterval);
            this.subscriptionRenewalInterval = setInterval(() => {
                this.registerForUpdates();
            }, 8000);

            const requiredState = [
                ...MixerService.getChannelAddresses('/config/name'),
                ...MixerService.getChannelAddresses('/mix/on'),
                ...MixerService.getAuxInAddresses('/config/name'),
                ...MixerService.getAuxInAddresses('/mix/on'),
                ...MixerService.getFxReturnAddresses('/config/name'),
                ...MixerService.getFxReturnAddresses('/mix/on'),
                ...MixerService.getBusAddresses('/config/name'),
                ...MixerService.getBusAddresses('/mix/on'),
                ...MixerService.getMatrixAddresses('/config/name'),
                ...MixerService.getMatrixAddresses('/mix/on'),
                ...MixerService.getDCAAddresses('/config/name'),
                ...MixerService.getDCAAddresses('/on'),
                '/main/st/config/name',
                '/main/m/config/name',
                '/main/st/mix/on',
                '/main/m/mix/on',
                ...this.requiredFaders
            ];
            requiredState.forEach(address => {
                this.queueEnsureLoaded(address);
            });
        });
        this.osc.on('message', message => {
            if (message.address.startsWith('/meters')) {
                const arg = (message.args as MetaArgument[])[0];
                if (arg != null && arg.type === 'b') {
                    const metersData = arg.value;
                    const withoutLength = metersData.slice(4);
                    const floatCount = withoutLength.byteLength / 4;
                    if (floatCount !== 70) {
                        this.logger.warn(`Received meters message with ${floatCount} floats? (Expected 70)`);
                        return;
                    } else {
                        const dataView = new DataView(withoutLength.buffer);
                        const meterValues = range(0, floatCount).map(i => dataView.getFloat32(i * 4, true));
                        meterValues.forEach((value, i) => {
                            this.localMixerChannelLevels.set(String(i), floatToDB(value));
                        });
                    }
                }
                this.debouncedUpdateMixerLevelsReplicant();
            } else {
                this.oscState.set(message.address, message.args as MetaArgument[]);
                if (this.inFlightRequests[message.address]) {
                    this.inFlightRequests[message.address]();
                    delete this.inFlightRequests[message.address];
                }
                if (message.address.endsWith('/config/name')) {
                    this.debouncedUpdateStateReplicant();
                }
            }
        });
        this.osc.open();
    }

    private updateStateReplicant() {
        const findName = (address: string): string | undefined => {
            const stateItem = this.oscState.get(address);
            const value = stateItem != null && stateItem[0].type === 's' ? stateItem[0].value as string : undefined;
            return value?.length === 0 ? undefined : value;
        }

        this.mixerState.value = {
            connectionState: this.mixerState.value.connectionState,
            mainLRName: findName('/main/st/config/name') ?? 'LR',
            mainMonoName: findName('/main/m/config/name') ?? 'M/C',
            channelNames: MixerService.getChannelAddresses('/config/name').map((address, i) => findName(address) ?? `Ch ${String(i + 1).padStart(2, '0')}`),
            auxInNames: MixerService.getAuxInAddresses('/config/name').map((address, i) => findName(address) ?? `Aux ${i + 1}`),
            fxReturnNames: MixerService.getFxReturnAddresses('/config/name').map((address, i) => findName(address) ?? `Fx ${Math.floor(i / 2) + 1}${i % 2 === 0 ? 'L' : 'R'}`),
            busNames: MixerService.getBusAddresses('/config/name').map((address, i) => findName(address) ?? `Bus ${i + 1}`),
            matrixNames: MixerService.getMatrixAddresses('/config/name').map((address, i) => findName(address) ?? `Matrix ${i + 1}`),
            dcaNames: MixerService.getDCAAddresses('/config/name').map((address, i) => findName(address) ?? `DCA ${i + 1}`)
        };
    }

    private updateMixerLevelsReplicant() {
        this.assignedChannels.forEach(channelId => {
            const muteState = this.oscState.get(`${this.channelIdToAddressPrefix[channelId]}/mix/on`);
            if (muteState != null && muteState[0].type === 'i' && muteState[0].value === 0) {
                this.nodecg.sendMessage('level:mixer', [channelId, -90]);
            } else {
                this.nodecg.sendMessage('level:mixer', [channelId, this.localMixerChannelLevels.get(String(channelId)) ?? -90]);
            }
        });
    }

    private static getChannelAddresses(suffix: string): string[] {
        return range(1, 33).map(i => `/ch/${String(i).padStart(2, '0')}${suffix}`);
    }
    private static getAuxInAddresses(suffix: string): string[] {
        return range(1, 9).map(i => `/auxin/0${i}${suffix}`);
    }
    private static getFxReturnAddresses(suffix: string): string[] {
        return range(1, 9).map(i => `/fxrtn/0${i}${suffix}`);
    }
    private static getBusAddresses(suffix: string): string[] {
        return range(1, 17).map(i => `/bus/${String(i).padStart(2, '0')}${suffix}`);
    }
    private static getMatrixAddresses(suffix: string): string[] {
        return range(1, 7).map(i => `/mtx/0${i}${suffix}`);
    }
    private static getDCAAddresses(suffix: string): string[] {
        return range(1, 9).map(i => `/dca/${i}${suffix}`);
    }

    private registerForUpdates() {
        if (this.osc == null) return;
        this.osc.send({ address: '/xremote', args: [] });

        this.osc!.send({
            address: '/meters',
            args: [
                { type: 's', value: '/meters/0' },
                { type: 'i', value: 50 }
            ]
        });
    }

    private queueEnsureLoaded(path: string) {
        if (this.osc == null) return;
        this.requestQueue.add(async () => {
            if (this.inFlightRequests[path] || this.oscState.has(path)) return;

            const p = new Promise<void>(resolve => {
                this.inFlightRequests[path] = resolve;
            });

            this.osc!.send({
                address: path,
                args: []
            });

            await p;
        }).catch(e => {
            delete this.inFlightRequests[path];
            this.logError(`OSC request failed at path ${path}`, e);
        });
    }

    private channelItemToFaderPath(item: ChannelItem): string {
        switch (item.type) {
            case 'AUX_IN':
            case 'BUS':
            case 'CHANNEL':
            case 'FX_RETURN':
            case 'MATRIX':
                const base = {
                    'AUX_IN': '/auxin/',
                    'BUS': '/bus/',
                    'CHANNEL': '/ch/',
                    'FX_RETURN': '/fxrtn/',
                    'MATRIX': '/mtx/'
                }[item.type];
                return `${base}${String(item.number).padStart(2, '0')}/mix/fader`;
            case 'DCA':
                return `/dca/${item.number}/fader`;
        }
    }

    static hasRequiredConfig(nodecg: NodeCG.ServerAPI<Configschema>) {
        return nodecg.bundleConfig.x32?.address != null;
    }
}
