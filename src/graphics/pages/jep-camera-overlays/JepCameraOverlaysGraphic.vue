<template>
    <div class="camera-overlays">
        <opacity-swap-transition>
            <div
                v-if="showClueLowerThird"
                class="clue-lower-third layout horizontal center-horizontal center-vertical"
            >
                <div>
                    {{ jepStore.finalJeopardyClue?.prompt }}
                </div>
            </div>
        </opacity-swap-transition>
        <div class="clue-box-wrapper">
            <transition name="clue-box">
                <div
                    v-if="jepStore.jepOverlays.clueBoxVisible"
                    class="clue-box"
                >
                    <div>
                        {{ jepStore.selectedClue?.prompt }}
                    </div>
                </div>
            </transition>
        </div>
        <div
            class="score-overlay"
            :style="{
                '--column-count': Math.max(1, jepStore.jepContestants.length),
                bottom: scoreOverlayBottomPosition
            }"
        >
            <jep-contestant-display
                v-for="(contestant, i) of jepStore.jepContestants"
                :contestant="contestant"
                :contestant-index="i"
            />
            <div
                v-for="(contestant) of jepStore.jepContestants"
                class="contestant-signature bg-panel"
            >
                <div class="bg-inset">
                    <img
                        class="signature-image"
                        :src="contestant.signatureUrl"
                    />
                </div>
            </div>
            <template v-if="jepStore.jepContestants.length === 0">
                <div class="bg-panel" />
                <div class="bg-panel" />
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import JepContestantDisplay from 'components/jep/JepContestantDisplay.vue';
import { useJepStore } from 'client-shared/stores/JepStore';
import { computed } from 'vue';
import OpacitySwapTransition from 'components/OpacitySwapTransition.vue';

const jepStore = useJepStore();

const showClueLowerThird = computed(() =>
    jepStore.jepState.state === 'FINAL_JEP_AWAITING_ANSWERS' &&
    jepStore.jepOverlays.scoreOverlayMode === 'NONE');

const scoreOverlayBottomPosition = computed(() => {
    if (showClueLowerThird.value) {
        return '-409px';
    }

    switch (jepStore.jepOverlays.scoreOverlayMode) {
        case 'COMPACT':
            return '-302px';
        case 'FULL':
            return '0px';
        default:
            return '-409px';
    }
});
</script>

<style scoped lang="scss">
@use '../../styles/constants';
@use '../../styles/colors';

.camera-overlays {
    width: 1920px;
    height: 1080px - constants.$omnibarHeight;
    position: relative;
}

.score-overlay {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 90%;
    display: grid;
    grid-template-columns: repeat(var(--column-count), minmax(0, 1fr));
    grid-template-rows: minmax(0, 100px) minmax(0, 300px);
    gap: 3px;
    border: 3px solid colors.$layout-gap;
    background-color: colors.$layout-gap;
    transition: bottom 500ms cubic-bezier(0.65, 0, 0.35, 1);
}

.contestant-signature {
    padding: 8px;

    > * {
        width: 100%;
        height: 100%;
    }
}

.signature-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
}

.clue-lower-third {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    bottom: 100px;
    width: 80%;
    text-align: center;
    background: linear-gradient(to right, rgba(2, 6, 39, 0) 0%, rgba(2, 6, 39, 1) 10%, rgba(2, 6, 39, 1) 90%, rgba(2, 6, 39, 0) 100%);
    font-family: 'Mass Transit Mono';
    font-weight: 700;
    text-rendering: geometricPrecision;
    color: #ffffff;
    font-size: 48px;
    padding: 24px 6%;
    box-sizing: border-box;
    min-height: 210px;
    line-height: 1.1;

    > * {
        filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.75));
    }
}

.clue-box-wrapper {
    position: absolute;
    left: 12%;
    top: 10%;
    width: 30lvw;
    height: 45lvh;
    perspective: 1000px;
    transform-style: preserve-3d;
    perspective-origin: center center;
    filter: drop-shadow(8px 8px 8px rgba(0, 0, 0, 0.5));
}

// i can't believe they just added a third dimension into css. i don't like it here
.clue-box {
    --clue-box-bg: #111218;
    --clue-box-bg-shadow: #101016;
    --x: 500px;
    --y: 45px;
    --z: 400px;

    font-family: 'Mass Transit Mono';
    font-weight: 700;
    text-rendering: geometricPrecision;
    color: #ffffff;
    font-size: 40px;
    line-height: 1.1;
    text-align: center;

    position: absolute;
    top: 100%;
    left: 50%;
    width: var(--x);
    height: var(--y);
    transform-origin: center;
    transform-style: preserve-3d;
    transform: translate3d(-50%, -100%, 0) rotateX(90deg);
    background: var(--clue-box-bg-shadow);

    &:before, &:after, > div, > div:before, > div:after {
        content: '';
        position: absolute;
        transform-style: preserve-3d;
        background: var(--clue-box-bg);
    }

    &:before {
        right: 0;
        top: 0;
        width: var(--z);
        height: var(--y);
        transform-origin: center right;
        rotate: y 90deg;
    }

    &:after {
        left: 0;
        top: 0;
        width: var(--z);
        height: var(--y);
        transform-origin: center left;
        rotate: y -90deg;
    }

    > div {
        right: 0;
        bottom: 0;
        width: var(--x);
        height: var(--z);
        transform-origin: bottom center;
        rotate: x -90deg;

        text-shadow: 0 0 2px rgba(255, 255, 255, 0.75);
        box-shadow: inset 0 0 12px rgba(255, 255, 255, 0.2);
        background: #0a0a0a;
        box-sizing: border-box;
        padding: 24px;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    > div:before {
        right: 0;
        bottom: 0;
        width: var(--x);
        height: var(--z);
        transform-origin: center;
        translate: 0 0 calc(var(--y) * -1);
        rotate: y 180deg;
        background: url('../../assets/img/jep-daily-double-clue-box.png');
        background-size: cover;
    }

    > div:after {
        right: 0;
        top: 0;
        width: var(--x);
        height: var(--y);
        transform-origin: top center;
        rotate: x -90deg;
    }
}

.clue-box-enter-active {
    animation-duration: 2500ms;
    animation-name: clue-box-reveal;
}
.clue-box-leave-active {
    transition-duration: 1000ms;
    transition-property: transform;
}
.clue-box-leave-active {
    transition-timing-function: cubic-bezier(0.32, 0, 0.67, 0);
}
.clue-box-leave-to {
    transform: translateX(-300%) translateY(-50%) rotate3d(-0.1, 1, -0.125, 0.6turn);
}

@keyframes clue-box-reveal {
    0% {
        transform: translate3d(-50%, -100%, 0) translateX(-300%) rotate3d(0.1, 1, -0.125, 0.5turn);
        animation-timing-function: cubic-bezier(0.33, 1, 0.68, 1);
    }
    60% {
        transform: translate3d(-50%, -100%, 0) rotateX(90deg) rotateZ(-180deg);
        animation-timing-function: cubic-bezier(0.77, -0.5, 0.25, 1.25);
    }
    100% {
        transform: translate3d(-50%, -100%, 0) rotateX(90deg);
    }
}
</style>
