<template>
    <ipl-dialog
        v-model:is-open="isOpen"
        style="width: 400px"
    >
        <template #header>
            <ipl-dialog-title
                title="Assign mixer channels"
                @close="isOpen = false"
            />
        </template>

        <ipl-space
            class="layout horizontal center-horizontal"
            color="secondary"
        >
            <ipl-checkbox
                v-model="showAllChannels"
                label="Show all channels"
            />
        </ipl-space>

        <template v-if="scheduleStore.activeSpeedrun?.relay">
            <div class="m-t-8">Teams</div>
            <hr class="m-y-2">
            <mixer-channel-assignment-space
                v-for="(team, i) in scheduleStore.activeSpeedrun.teams"
                :speaking-threshold="teamChannels[team.id]?.speakingThresholdDB"
                :assigned-channel="teamChannels[team.id]?.channelId"
                :visible="isOpen"
                class="m-t-8"
                :show-all-channels="showAllChannels"
                :label="getTeamAssignmentLabel(i, team)"
                @update:assigned-channel="selectChannel('team', team.id, $event)"
                @update:speaking-threshold="updateSpeakingThreshold('team', team.id, $event)"
            />
            <div class="m-t-8">Players</div>
            <hr class="m-y-2">
        </template>
        <mixer-channel-assignment-space
            v-for="talentId in scheduleStore.activeSpeedrunTalentIds"
            :speaking-threshold="talentChannels[talentId]?.speakingThresholdDB"
            :assigned-channel="talentChannels[talentId]?.channelId"
            :visible="isOpen"
            class="m-t-8"
            :label="getTalentAssignmentLabel(talentId)"
            :show-all-channels="showAllChannels"
            @update:assigned-channel="selectChannel('talent', talentId, $event)"
            @update:speaking-threshold="updateSpeakingThreshold('talent', talentId, $event)"
        />
        <mixer-channel-assignment-space
            :speaking-threshold="hostChannel.speakingThresholdDB"
            :assigned-channel="hostChannel.channelId"
            :label="hostAssignmentLabel"
            class="m-t-8"
            :show-all-channels="showAllChannels"
            :visible="isOpen"
            @update:assigned-channel="hostChannel.channelId = $event"
            @update:speaking-threshold="hostChannel.speakingThresholdDB = $event"
        />

        <template #footer>
            <div class="layout horizontal">
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
            </div>
        </template>
    </ipl-dialog>
</template>

<script setup lang="ts">
import { IplButton, IplCheckbox, IplDialog, IplDialogTitle, IplSpace } from '@iplsplatoon/vue-components';
import { computed, ref } from 'vue';
import { useMixerStore } from 'client-shared/stores/MixerStore';
import { useScheduleStore } from 'client-shared/stores/ScheduleStore';
import { useTalentStore } from 'client-shared/stores/TalentStore';
import { MixerChannelAssignment, Speedrun } from 'types/schemas';
import MixerChannelAssignmentSpace from '../../components/MixerChannelAssignmentSpace.vue';
import { isBlank } from 'shared/StringHelper';

const mixerStore = useMixerStore();
const scheduleStore = useScheduleStore();
const talentStore = useTalentStore();

type ChannelAssignment = { channelId?: number, speakingThresholdDB?: number };

const showAllChannels = ref(false);
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
        host: hostChannel.value.channelId == null ? undefined : (hostChannel.value as MixerChannelAssignment),
        speedrunPlaylist: mixerStore.mixerChannelAssignments.speedrunPlaylist
    });
}

function getTalentAssignmentLabel(talentId: string): string {
    return talentStore.findTalentItemById(talentId)?.name ?? `[Unknown Name]`;
}

function getTeamAssignmentLabel(teamIndex: number, team: Speedrun['teams'][number]): string {
    return isBlank(team.name) ? `Team ${teamIndex + 1} - ${talentStore.formatTalentIdList(team.playerIds)}` : team.name!;
}

const hostAssignmentLabel = computed(() => {
    if (talentStore.currentHostId == null) {
        return 'Host (None currently assigned)';
    } else {
        return `${talentStore.findTalentItemById(talentStore.currentHostId)?.name ?? `[Unknown Name]`} (Host)`;
    }
});

const isOpen = ref(false);
function open() {
    talentChannels.value = Object.entries(mixerStore.mixerChannelAssignments.speedrunTalent).reduce((result, [talentId, assignment]) => {
        result[talentId] = {
            channelId: assignment.channelId,
            speakingThresholdDB: assignment.speakingThresholdDB
        };
        return result;
    }, {} as Record<string, ChannelAssignment>);
    const existingHostChannel = mixerStore.mixerChannelAssignments.host;
    if (existingHostChannel == null) {
        hostChannel.value = { };
    } else {
        hostChannel.value = { ...existingHostChannel };
    }
    showAllChannels.value = false;
    isOpen.value = true;
}
defineExpose({
    open
});
</script>
