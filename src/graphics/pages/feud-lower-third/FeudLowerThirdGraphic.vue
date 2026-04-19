<template>
    <transition
        name="wrapper"
        :duration="500"
        mode="out-in"
    >
        <div
            v-if="feudStore.feudLowerThirdMode !== 'HIDDEN'"
            class="feud-lower-third-wrapper layout horizontal center-horizontal"
            :key="feudStore.feudLowerThirdMode"
        >
            <feud-lower-third-team v-if="feudStore.feudLowerThirdMode !== 'TEAM_B'" team="teamA" />
            <div v-if="feudStore.feudLowerThirdMode === 'BOTH_TEAMS'" class="score-counter-wrapper bg-panel">
                <div class="score-counter bg-inset layout vertical center-horizontal">
                    <div class="layout horizontal">
                        <seven-segment-digits
                            :digit-count="3"
                            :value="feudStore.feudTeamInfo.teamA.score"
                            align="left"
                        />
                        <div class="dash">-</div>
                        <seven-segment-digits
                            :digit-count="3"
                            :value="feudStore.feudTeamInfo.teamB.score"
                            color="red"
                        />
                    </div>
                </div>
            </div>
            <feud-lower-third-team v-if="feudStore.feudLowerThirdMode !== 'TEAM_A'" team="teamB" />
        </div>
    </transition>
</template>

<script setup lang="ts">
import { useFeudStore } from 'client-shared/stores/FeudStore';
import FeudLowerThirdTeam from './FeudLowerThirdTeam.vue';
import SevenSegmentDigits from 'components/SevenSegmentDigits.vue';

const feudStore = useFeudStore();
</script>

<style scoped lang="scss">
@use '../../styles/colors';

.feud-lower-third-wrapper {
    position: absolute;
    width: 96%;
    left: 2%;
    bottom: 100px;
    gap: 16px;
    align-items: flex-end;

    > * {
        max-width: 50dvw;
        border: 2px solid colors.$layout-gap;
    }
}

.score-counter-wrapper {
    padding: 12px;
    width: 285px;
}

.score-counter {
    font-size: 42px;

    .dash {
        color: colors.$vfd-teal;
        margin: 0 8px;
    }
}

.wrapper-enter-active > * {
    transition-property: transform, opacity;
    transition-duration: 350ms, 250ms;
    transition-timing-function: cubic-bezier(0.33, 1, 0.68, 1), linear;
}
.wrapper-enter-from > * {
    opacity: 0;
    transform: translateY(25px);
}
.wrapper-enter-active > .feud-lower-third-team {
    transition-delay: 150ms;
}

.wrapper-leave-active > * {
    transition-property: transform, opacity;
    transition-duration: 350ms, 250ms;
    transition-delay: 0ms, 100ms;
    transition-timing-function: cubic-bezier(0.32, 0, 0.67, 0), linear;
}
.wrapper-leave-to > * {
    opacity: 0;
    transform: translateY(-25px);
}
.wrapper-leave-active > .score-counter-wrapper {
    transition-delay: 150ms, 250ms;
}
</style>
