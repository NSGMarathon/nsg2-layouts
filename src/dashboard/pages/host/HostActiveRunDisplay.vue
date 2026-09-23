<template>
    <ipl-message
        v-if="scheduleStore.activeSpeedrun == null"
        type="warning"
    >
        No speedrun is currently active
    </ipl-message>
    <ipl-space
        v-else
        class="host-active-run-display"
    >
        <div class="m-t-8 m-b-16 m-x-8">
            <div class="text-low-emphasis">Active run ({{ speedrunCount.current === -1 ? '?' : speedrunCount.current }}/{{ speedrunCount.total }})</div>
            <div class="speedrun-name">{{ scheduleStore.activeSpeedrun.title }}</div>
            <div class="overflow-anywhere">{{ scheduleStore.activeSpeedrun.category }}</div>
        </div>
        <ipl-space
            color="secondary"
            class="text-center m-x-8 m-b-8"
        >
            <span
                class="main-timer-display"
                :style="{ color: timerColor }"
            >
                {{ formatTimer(timerStore.timer.time) }}
            </span>
        </ipl-space>
        <div
            v-for="team in scheduleStore.activeSpeedrun.teams"
            :key="team.id"
            class="team"
        >
            <div class="overflow-anywhere">{{ team.name || talentStore.formatTalentIdList(team.playerIds, 4) }}</div>
            <div
                class="team-result"
                :class="{
                    finished: timerStore.timer.teamResults[team.id]?.state === 'FINISHED',
                    forfeited: timerStore.timer.teamResults[team.id]?.state === 'FORFEIT'
                }"
            >
                <template v-if="timerStore.timer.teamResults[team.id] == null">
                    Waiting for result...
                </template>
                <template v-else>
                    {{ timerStore.timer.teamResults[team.id].state === 'FORFEIT' ? 'Forfeited' : 'Finished' }}
                    <span>{{ formatTimer(timerStore.timer.teamResults[team.id].time, true) }}</span>
                </template>
            </div>
        </div>
    </ipl-space>
</template>

<script setup lang="ts">
import { IplMessage, IplSpace } from '@iplsplatoon/vue-components';
import { useScheduleStore } from 'client-shared/stores/ScheduleStore';
import { computed } from 'vue';
import { useTimerStore } from 'client-shared/stores/TimerStore';
import { useTalentStore } from 'client-shared/stores/TalentStore';
import { formatTimer } from 'client-shared/helpers/TimerHelper';

const scheduleStore = useScheduleStore();
const timerStore = useTimerStore();
const talentStore = useTalentStore();

const speedrunCount = computed(() => scheduleStore.speedrunCount(scheduleStore.activeSpeedrun?.id));
const timerColor = computed(() => {
    switch (timerStore.timer.state) {
        case 'STOPPED':
        case 'RUNNING':
            return '#FFF';
        case 'PAUSED':
            return '#FFD337';
        default:
            return '#06D669';
    }
});

</script>

<style scoped lang="scss">
@use '../../styles/dashboard-colors';

.host-active-run-display {
    padding: 8px 0 0 !important;
}

.speedrun-name {
    font-weight: 700;
    font-size: 1.5em;
    overflow-wrap: anywhere;
}

.main-timer-display {
    font-size: 1.5em;
    font-weight: 600;
}

.team {
    border-top: 1px solid var(--ipl-input-color);
    padding: 8px;
    min-height: 32px;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 8px;

    &:nth-of-type(odd) {
        background-color: var(--ipl-input-color-alpha);
    }
}

.team-result {
    justify-self: end;

    &.finished {
        color: dashboard-colors.$state-green;
    }

    &.forfeited {
        color: dashboard-colors.$state-red;
    }
}
</style>
