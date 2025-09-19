<template>
    <div class="other-nameplate-grid layout vertical">
        <div
            v-if="speedrunPlaylistStore.speedrunPlaylistState.isRunning"
            class="speedrun-playlist-data-layout m-b-8"
            :class="{ 'without-volume-meter': speedrunPlaylistChannelAssignment == null }"
        >
            <div class="max-width">
                <div class="pre-recorded-label">
                    Pre-recorded
                    <svg viewBox="0 0 15 15">
                        <path d="M0,0L15,7.5L0,15Z" />
                    </svg>
                </div>
            </div>
            <div class="speedrun-playlist-data max-width layout horizontal center-horizontal end-vertical">
                <mixer-volume-meter
                    v-if="speedrunPlaylistChannelAssignment != null"
                    :channel-assignments="speedrunPlaylistChannelAssignment"
                    class="speedrun-playlist-volume-meter"
                />
                <div class="playlist-index-indicator layout vertical end-vertical m-t-8">
                    <span>TRACK</span>
                    <seven-segment-digits :digit-count="2" :value="activeSpeedrunIndexInSpeedrunPlaylist + 1" />
                </div>
            </div>
        </div>
        <table>
            <tbody>
                <tr
                    v-for="(talentRow, i) in talent"
                    :key="i"
                >
                    <other-nameplate-grid-cell
                        v-for="(talent, j) in talentRow"
                        :key="talent?.id ?? j"
                        :talent="talent"
                        :cell-index="talentStore.currentHostId != null && talent?.id === talentStore.currentHostId ? 'H' : i * rowCount + j + 1 + baseIndex"
                    />
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script setup lang="ts">
import { useScheduleStore } from 'client-shared/stores/ScheduleStore';
import { computed, inject } from 'vue';
import { useTalentStore } from 'client-shared/stores/TalentStore';
import chunk from 'lodash/chunk';
import { TalentItem } from 'types/ScheduleHelpers';
import { defaultSpeakingThreshold, useMixerStore } from 'client-shared/stores/MixerStore';
import { GameLayoutFeedIndexInjectionKey } from '../../helpers/Injections';
import { useSpeedrunPlaylistStore } from 'client-shared/stores/SpeedrunPlaylistStore';
import MixerVolumeMeter from './MixerVolumeMeter.vue';
import { MixerVolumeMeterChannelAssignment } from '../../helpers/MixerVolumeMeter';
import SevenSegmentDigits from 'components/SevenSegmentDigits.vue';
import { disableVolumeMeters } from 'client-shared/stores/MixerStore';
import OtherNameplateGridCell from 'components/OtherNameplateGridCell.vue';

const scheduleStore = useScheduleStore();
const talentStore = useTalentStore();
const mixerStore = useMixerStore();
const speedrunPlaylistStore = useSpeedrunPlaylistStore();

const activeSpeedrunIndexInSpeedrunPlaylist = computed(() => {
    if (scheduleStore.activeSpeedrun == null || scheduleStore.speedrunPlaylist.length === 0) return -1;

    return scheduleStore.speedrunPlaylist.findIndex(scheduleItem => scheduleItem.id === scheduleStore.activeSpeedrun!.id);
});

const speedrunPlaylistChannelAssignment = computed<MixerVolumeMeterChannelAssignment | null>(() => {
    if (mixerStore.mixerChannelAssignments.speedrunPlaylist == null || disableVolumeMeters) {
        return null;
    } else {
        return {
            channelIds: [mixerStore.mixerChannelAssignments.speedrunPlaylist.channelId!],
            speakingThresholdDB: mixerStore.mixerChannelAssignments.speedrunPlaylist.speakingThresholdDB ?? defaultSpeakingThreshold
        };
    }
});

const columnCount = 2;
const rowCount = 2;
const feedIndex = inject(GameLayoutFeedIndexInjectionKey, 0);

const baseIndex = computed(() => scheduleStore.playerNameplateAssignments[feedIndex].assignments.reduce((result, assignment) => {
    if (scheduleStore.getNameplateGlobalTeamName(feedIndex, assignment) != null) {
        result += 1;
    } else {
        result += assignment.players.length;
    }
    return result;
}, 0));
const talent = computed(() => {
    const result: (TalentItem | null)[] = [
        ...((scheduleStore.activeSpeedrun?.commentatorIds ?? [])).map(commentatorId => commentatorId.id),
        speedrunPlaylistStore.speedrunPlaylistState.isRunning ? null : talentStore.currentHostId
    ]
        .map(talentId => talentStore.findTalentItemById(talentId))
        .filter(talent => talent != null) ?? [];
    if (result.length % columnCount > 0 || result.length === 0) {
        result.push(...Array.from({ length: (result.length === 0) ? columnCount : (result.length % columnCount) }, () => null));
    }
    return chunk(result, columnCount);
});
</script>

<style scoped lang="scss">
@use 'sass:color';
@use '../../styles/decorations';
@use '../../styles/colors';

.other-nameplate-grid {
    @include decorations.inset-container;

    padding: 8px;
    color: colors.$vfd-teal;
}

table {
    width: 100%;
    flex-grow: 1;
    border-collapse: collapse;
    table-layout: fixed;
}

.speedrun-playlist-data-layout {
    border: 2px solid colors.$vfd-red;
    display: flex;
    flex-direction: column;
    align-items: center;

    &.without-volume-meter {
        flex-direction: row;
        border: 0;

        .speedrun-playlist-data {
            justify-content: flex-end;
        }

        .playlist-index-indicator {
            flex-direction: row;
            align-items: flex-end;

            > span {
                position: static;
                margin-right: 8px;
            }
        }
    }
}

.speedrun-playlist-data {
    max-width: 450px;
    margin: -8px 0 6px;
    padding: 0 8px;
}

.pre-recorded-label {
    color: colors.$vfd-background;
    background-color: colors.$vfd-red;
    font-weight: 700;
    padding: 1px 12px;
    text-transform: uppercase;
    font-size: 22px;
    width: max-content;

    svg {
        height: 15px;
    }
}

.playlist-index-indicator {
    position: relative;
    font-size: 32px;

    > span {
        font-size: 18px;
        font-weight: 700;
        position: absolute;
        text-wrap: nowrap;
        right: 0;
        top: -22px;
    }
}

.speedrun-playlist-volume-meter {
    height: 18px;
    width: 100%;
}
</style>
