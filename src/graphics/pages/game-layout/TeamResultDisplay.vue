<template>
    <transition
        name="result"
    >
        <div
            v-if="result != null"
            class="result-display"
            :class="{
                [`x-${props.xPosition}`]: true,
                [`y-${props.yPosition}`]: true,
                [`animation-${props.animationDirection}`]: true,
                forfeit: result.state === 'FORFEIT'
            }"
        >
            <font-awesome-icon
                v-if="result.state === 'FINISHED'"
                icon="flag-checkered"
                class="finish-icon"
            />
            <div
                v-else
                class="forfeit-indicator"
            >
                Forfeit
            </div>
            <seven-segment-digits
                unlit-segment="8:88:88 .8"
                class="run-timer"
                :value="formatTimer(result.time, true, true)"
                :color="result.state === 'FORFEIT' ? 'red' : 'teal'"
            />
        </div>
    </transition>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { useTimerStore } from 'client-shared/stores/TimerStore';
import { useScheduleStore } from 'client-shared/stores/ScheduleStore';
import { formatTimer } from 'client-shared/helpers/TimerHelper';
import SevenSegmentDigits from 'components/SevenSegmentDigits.vue';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faFlagCheckered } from '@fortawesome/free-solid-svg-icons/faFlagCheckered';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { GameLayoutFeedIndexInjectionKey } from '../../helpers/Injections';

library.add(faFlagCheckered);

const scheduleStore = useScheduleStore();
const timerStore = useTimerStore();

const props = withDefaults(defineProps<{
    nameplateIndex: number
    xPosition: 'left' | 'right' | 'center'
    yPosition: 'bottom'
    animationDirection?: 'x' | 'y'
}>(), {
    animationDirection: 'y'
});

const feedIndex = inject(GameLayoutFeedIndexInjectionKey, 0);

const result = computed(() => {
    if ((scheduleStore.activeSpeedrun?.teams.length ?? 0) <= 1) return null;
    const assignment = scheduleStore.playerNameplateAssignments[feedIndex].assignments[props.nameplateIndex];
    if (assignment == null || assignment.players.length === 0) return null;
    const firstAssignmentTeam = assignment.players[0].teamId;
    if (assignment.players.length > 1 && !assignment.players.every(player => player.teamId === firstAssignmentTeam)) return null;
    return timerStore.timer.teamResults[firstAssignmentTeam];
});
</script>

<style scoped lang="scss">
@use 'sass:color';
@use '../../styles/colors';

.result-display {
    position: absolute;
    background-color: color.adjust(colors.$vfd-background, $alpha: -0.25);
    color: white;
    padding: 8px 8px 6px;
    font-size: 25px;
    display: flex;
    align-items: center;

    &.forfeit {
        flex-direction: column;
    }

    &.y-top {
        top: 0;
    }
    &.y-bottom {
        bottom: 0;
    }
    &.x-center {
        left: 50%;
        transform: translateX(-50%);
    }
    &.x-left {
        left: 0;
    }
    &.x-right {
        right: 0;
    }
}

.forfeit-indicator {
    color: colors.$vfd-red;
    text-transform: uppercase;
    font-weight: 700;
    font-size: 14px;
    margin-top: -4px;
    margin-right: -8px;
    letter-spacing: 13px;
}

.finish-icon {
    margin-right: 6px;
    color: colors.$vfd-teal;
    font-size: 22px;
}

.result-enter-active {
    transition-duration: 250ms;
    transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
    transition-property: transform;

    &.animation-x {
        transition-duration: 500ms;
    }
}
.result-leave-active {
    transition-duration: 250ms;
    transition-timing-function: ease-in;
    transition-property: transform;
}
.result-leave-to.y-bottom.animation-y,
.result-enter-from.y-bottom.animation-y {
    transform: translateY(100%);

    &.x-center {
        transform: translateY(100%) translateX(-50%);
    }
}
.result-leave-to.x-left.animation-x,
.result-enter-from.x-left.animation-x {
    transform: translateX(-100%);
}
.result-leave-to.x-right.animation-x,
.result-enter-from.x-right.animation-x {
    transform: translateX(100%);
}
.result-enter-to.animation-y {
    transform: translateY(0%);

    &.x-center {
        transform: translateY(0%) translateX(-50%);
    }
}
.result-enter-to.animation-x {
    transform: translateX(0%);
}
</style>
