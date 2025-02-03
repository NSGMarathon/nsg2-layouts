<template>
    <div class="team layout horizontal center-vertical">
        <div class="team-details">
            <div class="team-name">{{ props.team.name || talentStore.formatTalentIdList(team.playerIds, 4) }}</div>
            <div v-if="timerStore.timer.teamResults[team.id]">
                {{ timerStore.timer.teamResults[props.team.id].state === 'FORFEIT' ? 'Forfeited' : 'Finished' }}
                <span>{{ formatTimer(timerStore.timer.teamResults[props.team.id].time, true) }}</span>
            </div>
            <div v-if="assignedPlayers.length > 0" class="m-t-8">
                Now playing: <span class="text-bold">{{ talentStore.formatTalentIdList(assignedPlayers, 4) }}</span>
            </div>
            <div v-else-if="nameplateAssignment == null && scheduleStore.activeSpeedrun?.relay" class="m-t-8 no-nameplate-warning">
                Team has no nameplate assignment!<br>Try switching layouts.
            </div>
            <div
                v-if="scheduleStore.activeSpeedrun?.relay"
                class="relay-button-grid"
            >
                <ipl-button
                    small
                    :disabled="activeRelayPlayerIndex <= 0"
                    @click="selectPreviousRelayPlayer"
                >
                    <font-awesome-icon icon="chevron-left" />
                    Previous
                </ipl-button>
                <ipl-button
                    small
                    :disabled="nameplateAssignment == null"
                    @click="playerSelectOpen = true"
                >
                    Select player
                </ipl-button>
                <ipl-button
                    small
                    :disabled="activeRelayPlayerIndex === -1 || activeRelayPlayerIndex === props.team.playerIds.length - 1"
                    @click="selectNextRelayPlayer"
                >
                    Next
                    <font-awesome-icon icon="chevron-right" />
                </ipl-button>
            </div>
        </div>
        <div class="team-timer-controls">
            <ipl-button
                :disabled="timerStore.timer.state === 'STOPPED'"
                small
                :color="timerStore.timer.teamResults[props.team.id] ? 'yellow' : 'green'"
                @click="stopUndoTeamTimer"
            >
                <font-awesome-icon :icon="timerStore.timer.teamResults[team.id] ? 'rotate-left' : 'flag-checkered'" />
                {{ timerStore.timer.teamResults[props.team.id] ? 'Resume' : 'Finish' }}
            </ipl-button>
            <ipl-button
                :disabled="timerStore.timer.teamResults[props.team.id] != null || timerStore.timer.state === 'STOPPED'"
                small
                color="red"
                @click="forfeitTeam"
            >
                <font-awesome-icon icon="stop" />
                Forfeit
            </ipl-button>
        </div>
    </div>
    <ipl-dialog
        v-model:is-open="playerSelectOpen"
        style="width: 300px;"
    >
        <ipl-dialog-title
            title="Select Relay Player"
            class="m-b-8"
            color="secondary"
            @close="playerSelectOpen = false"
        />
        <ipl-space
            color="secondary"
            class="relay-player-list"
        >
            <ipl-space
                v-for="(player, i) in props.team.playerIds"
                clickable
                class="relay-select-player"
                @click="selectRelayPlayer(player.id)"
            >
                #{{ i + 1 }} - {{ talentStore.findTalentItemById(player.id)?.name ?? `Unknown talent ${player.id}` }}
            </ipl-space>
        </ipl-space>
    </ipl-dialog>
</template>

<script setup lang="ts">
import { IplButton, IplDialog, IplDialogTitle, IplSpace } from '@iplsplatoon/vue-components';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { Speedrun } from 'types/schemas';
import { useTimerStore } from 'client-shared/stores/TimerStore';
import { useScheduleStore } from 'client-shared/stores/ScheduleStore';
import { sendMessage } from 'client-shared/helpers/NodecgHelper';
import { useTalentStore } from 'client-shared/stores/TalentStore';
import { computed, ref } from 'vue';
import { formatTimer } from 'client-shared/helpers/TimerHelper';

const timerStore = useTimerStore();
const scheduleStore = useScheduleStore();
const talentStore = useTalentStore();

const props = defineProps<{
    team: Speedrun['teams'][number]
}>();

async function forfeitTeam() {
    if (['RUNNING', 'PAUSED'].includes(timerStore.timer.state)) {
        await sendMessage('timer:stop', { teamId: props.team.id, forfeit: true });
    }
}

async function stopUndoTeamTimer() {
    if (timerStore.timer.teamResults[props.team.id]) {
        await sendMessage('timer:undoStop', { teamId: props.team.id });
        return;
    }

    switch (timerStore.timer.state) {
        case 'RUNNING':
        case 'PAUSED':
            await sendMessage('timer:stop', { teamId: props.team.id });
            break;
        case 'FINISHED':
            await sendMessage('timer:undoStop', { teamId: props.team.id });
            break;
    }
}

const nameplateAssignment = computed(() => {
    if (!scheduleStore.activeSpeedrun?.relay) return null;
    return scheduleStore.activeRelayPlayers.find(activePlayer => activePlayer.teamId === props.team.id);
});

const assignedPlayers = computed(() => {
    if (!scheduleStore.activeSpeedrun?.relay) return [];
    return (nameplateAssignment.value?.playerIds ?? []).map(playerId => ({ id: playerId }));
});

const activeRelayPlayerIndex = computed(() => {
    if (!scheduleStore.activeSpeedrun?.relay) return -1;
    if (nameplateAssignment.value == null || nameplateAssignment.value.playerIds.length !== 1) return -1;
    return props.team.playerIds.findIndex(playerId => playerId.id === nameplateAssignment.value!.playerIds[0]);
});

async function selectPreviousRelayPlayer() {
    if (activeRelayPlayerIndex.value <= 0) return;
    const player = props.team.playerIds[activeRelayPlayerIndex.value - 1];
    await sendMessage('nameplate:setActiveRelayPlayer', { teamId: props.team.id, playerId: player.id });
}

async function selectNextRelayPlayer() {
    if (activeRelayPlayerIndex.value === -1 || activeRelayPlayerIndex.value === props.team.playerIds.length - 1) return;
    const player = props.team.playerIds[activeRelayPlayerIndex.value + 1];
    await sendMessage('nameplate:setActiveRelayPlayer', { teamId: props.team.id, playerId: player.id });
}

const playerSelectOpen = ref(false);
async function selectRelayPlayer(playerId: string) {
    await sendMessage('nameplate:setActiveRelayPlayer', { teamId: props.team.id, playerId });
    playerSelectOpen.value = false;
}
</script>

<style scoped lang="scss">
.team {
    border-top: 1px solid var(--ipl-input-color);
    padding: 8px;
    min-height: 40px;

    &:nth-of-type(odd) {
        background-color: var(--ipl-input-color-alpha);
    }
}

.team-timer-controls {
    max-width: 200px;
    min-width: 200px;
    flex-grow: 1;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
}

.team-details {
    flex-grow: 1;
}

.relay-button-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-top: 4px;
    max-width: 275px;
}

.no-nameplate-warning {
    color: #FF5959;
}

.relay-select-player:not(:first-child) {
    margin-top: 8px;
}

.relay-player-list {
    max-height: 75vh;
    overflow-y: auto;
}
</style>
