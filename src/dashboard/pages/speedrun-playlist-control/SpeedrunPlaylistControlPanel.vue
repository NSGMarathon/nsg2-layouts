<template>
    <mixer-channel-assignment-space
        :assigned-channel="playlistMixerChannel.channelId"
        :speaking-threshold="playlistMixerChannel.speakingThresholdDB"
        label="Playlist mixer channel"
        visible
        show-all-channels
        class="m-b-8"
        color="primary"
        @update:assigned-channel="playlistMixerChannel.channelId = $event"
        @update:speaking-threshold="playlistMixerChannel.speakingThresholdDB = $event"
    >
        <ipl-button
            class="m-t-8"
            label="Update"
            @click="updateMixerChannel"
        />
    </mixer-channel-assignment-space>
    <ipl-space>
        <ipl-message
            v-if="scheduleStore.speedrunPlaylist.length === 0"
            type="warning"
        >
            Currently not in speedrun playlist
            <template v-if="scheduleStore.activeSpeedrun == null">
                - Active speedrun is unknown
            </template>
            <template v-else-if="scheduleStore.activeSpeedrunIndex === -1">
                - Active speedrun is not in the schedule
            </template>
            <template v-else-if="scheduleStore.activeSpeedrun.videoFile == null">
                - Active speedrun has no video file
            </template>
        </ipl-message>
        <template v-else>
            <div class="title">Active speedrun playlist</div>
            <ipl-space
                v-for="speedrun of scheduleStore.speedrunPlaylist"
                :key="speedrun.id"
                :color="speedrun.id === scheduleStore.activeSpeedrun?.id ? 'blue' : 'secondary'"
                class="m-t-8"
            >
                <template v-if="speedrun.id === scheduleStore.activeSpeedrun?.id">
                    ▶
                </template>
                {{ speedrun.title }}<br>
                <small>est. {{ formatScheduleItemEstimate(speedrun) }} - {{ speedrun.category }}</small>
            </ipl-space>
            <div class="layout horizontal m-t-8">
                <ipl-button
                    color="green"
                    :disabled="!canStartPlaylist"
                    async
                    @click="playPlaylist"
                >
                    <font-awesome-icon icon="play" />
                    Play
                </ipl-button>
                <ipl-button
                    color="red"
                    :disabled="!canStopPlaylist"
                    async
                    class="m-l-8"
                    @click="stopPlaylist"
                >
                    <font-awesome-icon icon="stop" />
                    Stop
                </ipl-button>
            </div>
        </template>
    </ipl-space>
</template>

<script setup lang="ts">
import { IplButton, IplMessage, IplSpace } from '@iplsplatoon/vue-components';
import { useScheduleStore } from 'client-shared/stores/ScheduleStore';
import { computed, ref, watch } from 'vue';
import { MixerChannelAssignment } from 'types/schemas';
import { formatScheduleItemEstimate } from 'client-shared/helpers/StringHelper';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faPlay } from '@fortawesome/free-solid-svg-icons/faPlay';
import { faStop } from '@fortawesome/free-solid-svg-icons/faStop';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { useObsStore } from 'client-shared/stores/ObsStore';
import { sendMessage } from 'client-shared/helpers/NodecgHelper';
import { useSpeedrunPlaylistStore } from 'client-shared/stores/SpeedrunPlaylistStore';
import MixerChannelAssignmentSpace from '../../components/MixerChannelAssignmentSpace.vue';
import { useMixerStore } from 'client-shared/stores/MixerStore';

library.add(faPlay, faStop);

const scheduleStore = useScheduleStore();
const obsStore = useObsStore();
const speedrunPlaylistStore = useSpeedrunPlaylistStore();
const mixerStore = useMixerStore();

const playlistMixerChannel = ref<Partial<MixerChannelAssignment>>({ });
watch(() => mixerStore.mixerChannelAssignments.speedrunPlaylist, newValue => {
    if (newValue == null) {
        playlistMixerChannel.value = { };
    } else {
        playlistMixerChannel.value = newValue;
    }
}, { immediate: true });

function updateMixerChannel() {
    mixerStore.setSpeedrunPlaylistChannel(playlistMixerChannel.value.channelId == null ? undefined : (playlistMixerChannel.value as MixerChannelAssignment));
}

const canStartPlaylist = computed(() =>
    !speedrunPlaylistStore.speedrunPlaylistState.isRunning
    && obsStore.obsState.status === 'CONNECTED'
    && !obsStore.obsState.transitionInProgress
    && !obsStore.obsConfig.gameplayScenes.filter(Boolean).some(gameplaySceneName => obsStore.obsState.currentScene === gameplaySceneName));

const canStopPlaylist = computed(() =>
    !obsStore.obsState.transitionInProgress
    && speedrunPlaylistStore.speedrunPlaylistState.isRunning);

async function playPlaylist() {
    return sendMessage('speedrunPlaylist:play');
}

async function stopPlaylist() {
    return sendMessage('speedrunPlaylist:stop');
}
</script>
