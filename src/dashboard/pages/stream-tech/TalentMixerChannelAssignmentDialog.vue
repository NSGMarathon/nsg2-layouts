<template>
    <ipl-dialog
        v-model:is-open="isOpen"
        style="width: 400px"
    >
        <ipl-dialog-title
            title="Assign mixer channels"
            color="secondary"
            @close="isOpen = false"
        />

        <template v-if="scheduleStore.activeSpeedrun?.relay">
            <div class="m-t-8">Teams</div>
            <hr class="m-y-2">
            <talent-mixer-channel-assignment-space
                v-for="(team, i) in scheduleStore.activeSpeedrun.teams"
                :speaking-threshold="teamChannels[team.id]?.speakingThresholdDB"
                :team-id="team.id"
                :assigned-channel="teamChannels[team.id]?.channelId"
                :visible="isOpen"
                class="m-t-8"
                :fallback-label="`Team ${i + 1}`"
                @update:assigned-channel="selectChannel('team', team.id, $event)"
                @update:speaking-threshold="updateSpeakingThreshold('team', team.id, $event)"
            />
            <div class="m-t-8">Players</div>
            <hr class="m-y-2">
        </template>
        <talent-mixer-channel-assignment-space
            v-for="talentId in scheduleStore.activeSpeedrunTalentIds"
            :speaking-threshold="talentChannels[talentId]?.speakingThresholdDB"
            :talent-id="talentId"
            :assigned-channel="talentChannels[talentId]?.channelId"
            :visible="isOpen"
            class="m-t-8"
            :fallback-label="`Unknown talent ${talentId}`"
            @update:assigned-channel="selectChannel('talent', talentId, $event)"
            @update:speaking-threshold="updateSpeakingThreshold('talent', talentId, $event)"
        />
        <talent-mixer-channel-assignment-space
            :speaking-threshold="hostChannel.speakingThresholdDB"
            :talent-id="talentStore.currentHostId"
            :assigned-channel="hostChannel.channelId"
            class="m-t-8"
            fallback-label="Host (None currently assigned)"
            talent-name-suffix="(Host)"
            :visible="isOpen"
            @update:assigned-channel="hostChannel.channelId = $event"
            @update:speaking-threshold="hostChannel.speakingThresholdDB = $event"
        />

        <ipl-space
            class="m-t-8 layout horizontal"
            color="secondary"
        >
            <ipl-button
                color="green"
                label="Save"
                @click="save"
            />
            <ipl-button
                color="red"
                label="Close"
                class="m-l-8"
                @click="isOpen = false"
            />
        </ipl-space>
    </ipl-dialog>
</template>

<script setup lang="ts">
import { IplButton, IplDialog, IplDialogTitle, IplSpace } from '@iplsplatoon/vue-components';
import { ref } from 'vue';
import { useMixerStore } from 'client-shared/stores/MixerStore';
import { useScheduleStore } from 'client-shared/stores/ScheduleStore';
import { useTalentStore } from 'client-shared/stores/TalentStore';
import { MixerChannelAssignment } from 'types/schemas';
import TalentMixerChannelAssignmentSpace from './TalentMixerChannelAssignmentSpace.vue';

const mixerStore = useMixerStore();
const scheduleStore = useScheduleStore();
const talentStore = useTalentStore();

type ChannelAssignment = { channelId?: number, speakingThresholdDB?: number };

const hostChannel = ref<ChannelAssignment>({ });
const talentChannels = ref<Record<string, ChannelAssignment>>({});
const teamChannels = ref<Record<string, ChannelAssignment>>({});

function selectChannel(dataType: 'team' | 'talent', id: string, channelId?: number) {
    const currentValue = dataType === 'team' ? teamChannels : talentChannels;
    const existingEntry = currentValue.value[id];
    if (existingEntry == null) {
        currentValue.value[id] = { channelId };
    } else {
        existingEntry.channelId = channelId;
    }
}

function updateSpeakingThreshold(dataType: 'team' | 'talent', id: string, threshold?: number) {
    const currentValue = dataType === 'team' ? teamChannels : talentChannels;
    const existingEntry = currentValue.value[id];
    if (existingEntry == null) {
        currentValue.value[id] = { speakingThresholdDB: threshold };
    } else {
        existingEntry.speakingThresholdDB = threshold;
    }
}

function save() {
    const channelMapToReplicant = (channelMap: Record<string, ChannelAssignment>) =>
        Object.entries(channelMap).reduce((result, [talentId, assignment]) => {
            if (assignment.channelId != null) {
                result[talentId] = {
                    channelId: Number(assignment.channelId),
                    speakingThresholdDB: assignment.speakingThresholdDB
                };
            }
            return result;
        }, {} as Record<string, MixerChannelAssignment>)

    mixerStore.updateTalentChannelAssignments({
        speedrunTeams: channelMapToReplicant(teamChannels.value),
        speedrunTalent: channelMapToReplicant(talentChannels.value),
        host: hostChannel.value.channelId == null ? undefined : (hostChannel.value as MixerChannelAssignment)
    });
}

const isOpen = ref(false);
function open() {
    talentChannels.value = Object.entries(mixerStore.talentMixerChannelAssignments.speedrunTalent).reduce((result, [talentId, assignment]) => {
        result[talentId] = {
            channelId: assignment.channelId,
            speakingThresholdDB: assignment.speakingThresholdDB
        };
        return result;
    }, {} as Record<string, ChannelAssignment>);
    const existingHostChannel = mixerStore.talentMixerChannelAssignments.host;
    if (existingHostChannel == null) {
        hostChannel.value = { };
    } else {
        hostChannel.value = { ...existingHostChannel };
    }
    isOpen.value = true;
}
defineExpose({
    open
});
</script>
