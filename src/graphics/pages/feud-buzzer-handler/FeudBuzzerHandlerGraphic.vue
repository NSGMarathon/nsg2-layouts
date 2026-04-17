<template>
    <div class="buzzer-handler-layout">
        <div
            v-if="visibleTeam === 'both' || visibleTeam === 'a'"
            class="team-a"
            :class="{ lit: feudStore.feudState.state === 'WAITING_FOR_FACEOFF_ANSWER' && noGuessMade && feudStore.feudState.firstToBuzz === 'teamA' }"
        />
        <div
            v-if="visibleTeam === 'both' || visibleTeam === 'b'"
            class="team-b"
            :class="{ lit: feudStore.feudState.state === 'WAITING_FOR_FACEOFF_ANSWER' && noGuessMade && feudStore.feudState.firstToBuzz === 'teamB' }"
        />
    </div>
</template>

<script setup lang="ts">
import { useFeudStore } from 'client-shared/stores/FeudStore';
import { sendMessage } from 'client-shared/helpers/NodecgHelper';
import { computed, onMounted, onUnmounted, watch } from 'vue';

const feudStore = useFeudStore();

const params = new URLSearchParams(window.location.search);
const teamABuzzKey = params.get('team-a-key')?.toLowerCase() ?? 'l';
const teamBBuzzKey = params.get('team-b-key')?.toLowerCase() ?? 'r';
const visibleTeam = params.get('team')?.toLowerCase() ?? 'both';
const disableAudio = params.has('no-audio');

const noGuessMade = computed(() =>
    feudStore.feudState.state === 'WAITING_FOR_FACEOFF_ANSWER'
    && !feudStore.feudState.anyGuessMadeBy.teamA
    && !feudStore.feudState.anyGuessMadeBy.teamB);

// store this locally, since replicant updates may be slightly delayed, causing multiple requests for pressing the
// buzzer to go through
let anyTeamBuzzed = false;

function onKeydown(event: KeyboardEvent) {
    if (anyTeamBuzzed || feudStore.feudState.state !== 'WAITING_FOR_BUZZER') return;

    if (event.key === teamABuzzKey || event.key === teamBBuzzKey) {
        anyTeamBuzzed = true;
        sendMessage('feud:setBuzzerWinner', { team: event.key === teamABuzzKey ? 'teamA' : 'teamB' });
    }
}

watch(() => feudStore.feudState, (newValue, oldValue) => {
    if (oldValue.state === 'WAITING_FOR_BUZZER' && newValue.state !== 'WAITING_FOR_BUZZER') {
        anyTeamBuzzed = false;
        if (!disableAudio) {
            nodecg.playSound('feud-buzzer');
        }
    }
});

onMounted(() => {
    window.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
    window.removeEventListener('keydown', onKeydown);
});
</script>

<style>
body {
    height: 100dvh;
    width: 100dvw;
}
</style>

<style lang="scss" scoped>
@use '../../styles/colors';

.buzzer-handler-layout {
    display: grid;
    grid-auto-columns: minmax(0, 1fr);
    grid-auto-flow: column;
    height: 100%;

    > * {
        position: relative;
        transition: background-color 100ms linear;

        &:after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(transparent, rgba(34, 34, 34, 0.3));
            mix-blend-mode: color-burn;
        }
    }

    > .team-a {
        background-color: colors.$vfd-teal-unlit;

        &.lit {
            background-color: colors.$vfd-teal;
        }
    }

    > .team-b {
        background-color: colors.$vfd-red-unlit;

        &.lit {
            background-color: colors.$vfd-red;
        }
    }
}
</style>
