import {
    ChannelItem,
    Configschema,
    MixerState,
    MixerChannelAssignments, MixerChannelAssignment
} from 'types/schemas';
import { defineStore } from 'pinia';
import { createReplicantStoreInitializer } from 'client-shared/helpers/StoreHelper';
import { useTalentStore } from 'client-shared/stores/TalentStore';
import { useSpeedrunPlaylistStore } from 'client-shared/stores/SpeedrunPlaylistStore';

const mixerState = nodecg.Replicant<MixerState>('mixerState');
const mixerChannelAssignments = nodecg.Replicant<MixerChannelAssignments>('mixerChannelAssignments');

interface MixerStore {
    mixerState: MixerState
    mixerChannelAssignments: MixerChannelAssignments
    mixerChannelLevels: Record<number, number>
}

export const defaultSpeakingThreshold = (nodecg.bundleConfig as Configschema).x32?.defaultSpeakingDBThreshold ?? -65;
export const disableVolumeMeters = (nodecg.bundleConfig as Configschema).x32?.disableNameplateVolumeMeters ?? false;

export const useMixerStore = defineStore('mixer', {
    state: () => ({
        mixerState: null,
        mixerChannelAssignments: null,
        mixerChannelLevels: {}
    } as unknown as MixerStore),
    actions: {
        updateTalentChannelAssignments(newValue: MixerChannelAssignments) {
            mixerChannelAssignments.value = newValue;
        },
        setSpeedrunPlaylistChannel(newValue: MixerChannelAssignment | undefined) {
            mixerChannelAssignments.value!.speedrunPlaylist = newValue;
        },
        listenForMixerLevels() {
            nodecg.listenFor('level:mixer', ([channelId, level]) => {
                this.mixerChannelLevels[channelId] = level;
            });
        }
    },
    getters: {
        disableVolumeMeters() {
            return disableVolumeMeters || useSpeedrunPlaylistStore().speedrunPlaylistState.isRunning;
        },
        mixerChannelOptions(state) {
            // Channel IDs:
            // 0-31 = Ch 1-32
            // 32-39 = Aux 1-8
            // 40-47 = Fx 1L-4R
            // 48-63 = Bus 1-16
            // 64-69 = Matrix 1-6

            const getChannelItemId = (channelItem: ChannelItem): string => {
                switch (channelItem.type) {
                    case 'MATRIX':
                        return String(channelItem.number + 63);
                    case 'FX_RETURN':
                        return String(channelItem.number + 39);
                    case 'DCA':
                        return '0';
                    case 'BUS':
                        return String(channelItem.number + 47);
                    case 'CHANNEL':
                        return String(channelItem.number - 1);
                    case 'AUX_IN':
                        return String(channelItem.number + 31);
                }
            }
            const visibleChannels = new Set(((nodecg.bundleConfig as Configschema).x32?.visibleChannels ?? []).map(channel => getChannelItemId(channel)));

            return (showAllChannels = false, selectedChannelId: string) => {
                const allChannels = [
                    { name: 'None', options: [{ value: 'none', name: 'None' }] },
                    {
                        name: 'Input Channels',
                        options: state.mixerState.channelNames.map((channelName, i) => ({
                            value: String(i),
                            name: channelName
                        }))
                    },
                    {
                        name: 'Aux Returns',
                        options: state.mixerState.auxInNames.map((channelName, i) => ({
                            value: String(i + 32),
                            name: channelName
                        }))
                    },
                    {
                        name: 'FX Returns',
                        options: state.mixerState.fxReturnNames.map((channelName, i) => ({
                            value: String(i + 40),
                            name: channelName
                        }))
                    },
                    {
                        name: 'Mix Buses',
                        options: state.mixerState.busNames.map((channelName, i) => ({
                            value: String(i + 48),
                            name: channelName
                        }))
                    },
                    {
                        name: 'Matrices',
                        options: state.mixerState.matrixNames.map((channelName, i) => ({
                            value: String(i + 64),
                            name: channelName
                        }))
                    }
                ];

                if (showAllChannels || visibleChannels.size === 0) {
                    return allChannels;
                } else {
                    return allChannels
                        .map((group, i) => ({
                            ...group,
                            options: i === 0 ? group.options : group.options.filter(option => visibleChannels.has(option.value) || option.value === selectedChannelId)
                        }))
                        .filter(group => group.options.length > 0);
                }
            };
        },
        isSpeaking(state) {
            const talentStore = useTalentStore();
            return (talentId: string | null | undefined, teamId: string | null | undefined) => {
                if (disableVolumeMeters || talentId == null) return false;
                const assignment = talentId === talentStore.currentHostId
                    ? state.mixerChannelAssignments.host
                    : state.mixerChannelAssignments.speedrunTalent[talentId] ?? (teamId == null ? null : state.mixerChannelAssignments.speedrunTeams[teamId]);
                return assignment == null
                    ? false
                    : (state.mixerChannelLevels[assignment.channelId] ?? -90) > (assignment.speakingThresholdDB ?? defaultSpeakingThreshold);
            };
        }
    }
});

export const initMixerStore = createReplicantStoreInitializer([mixerState, mixerChannelAssignments], useMixerStore);
