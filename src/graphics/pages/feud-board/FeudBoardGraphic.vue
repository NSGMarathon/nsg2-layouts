<template>
    <svg style="position: absolute">
        <filter id="fancy-number">
            <feSpecularLighting specularConstant="2" specularExponent="20" result="specOut" lighting-color="#777">
                <fePointLight x="50" y="10" z="100" />
            </feSpecularLighting>
            <feComposite in="specOut" in2="SourceAlpha" operator="in" result="specOut2"/>
            <feComposite in="SourceGraphic" in2="specOut2" operator="arithmetic" k1="1" k2="1" k3="0.25" k4="0" result="lit" />
        </filter>
        <defs>
            <path id="strike" d="M900,289.421l0,421.158c0,104.544 -84.877,189.421 -189.421,189.421l-421.158,0c-104.544,0 -189.421,-84.877 -189.421,-189.421l0,-421.158c0,-104.544 84.877,-189.421 189.421,-189.421l421.158,0c104.544,0 189.421,84.877 189.421,189.421Zm-100,-0c0,-49.353 -40.068,-89.421 -89.421,-89.421l-421.158,0c-49.353,0 -89.421,40.068 -89.421,89.421l0,421.158c0,49.353 40.068,89.421 89.421,89.421l421.158,0c49.353,0 89.421,-40.068 89.421,-89.421l0,-421.158Zm-370.711,210.579l-141.421,-141.421c-19.513,-19.513 -19.513,-51.198 -0,-70.711c19.513,-19.513 51.198,-19.513 70.711,-0l141.421,141.421l141.421,-141.421c19.513,-19.513 51.198,-19.513 70.711,-0c19.513,19.513 19.513,51.198 0,70.711l-141.421,141.421l141.421,141.421c19.513,19.513 19.513,51.198 0,70.711c-19.513,19.513 -51.198,19.513 -70.711,0l-141.421,-141.421l-141.421,141.421c-19.513,19.513 -51.198,19.513 -70.711,0c-19.513,-19.513 -19.513,-51.198 -0,-70.711l141.421,-141.421Z" fill="currentColor"/>
        </defs>
    </svg>
    <div class="feud-board-layout">
        <div class="bg-panel" />
        <div class="main-segment">
            <div class="bg-panel" />
            <div class="round-score-segment bg-timer layout horizontal center-vertical center-horizontal">
                <div class="bg-inset">
                    <seven-segment-digits
                        :digit-count="3"
                        :value="tweenedGuessedAnswerValue"
                    />
                </div>
            </div>
            <div class="answers-segment">
                <div
                    v-for="(column, i) of boardSpaces"
                    class="column"
                >
                    <div
                        v-for="(space, j) of column"
                        class="answer"
                        :class="{ guessed: space != null && space.guessed }"
                    >
                        <div class="guessed-answer layout horizontal center-vertical">
                            <div class="bg-inset max-width max-height layout horizontal center-vertical">
                                <div class="max-width" style="margin-top: -5px">
                                    <vfd-pixel-text
                                        :font-size="32"
                                        :text-content="space?.splitAnswer[0]"
                                        text-align="left"
                                        align="left"
                                    />
                                    <vfd-pixel-text
                                        :font-size="32"
                                        :text-content="space?.splitAnswer[1]"
                                        text-align="left"
                                        align="left"
                                    />
                                </div>
                                <div class="layout vertical center-horizontal">
                                    <seven-segment-digits
                                        :digit-count="2"
                                        :value="space?.value"
                                        class="value"
                                    />
                                    <div class="value-label">POINTS</div>
                                </div>
                            </div>
                        </div>
                        <div class="answer-index layout horizontal center-horizontal center-vertical">
                            <opacity-swap-transition :enter-delay="((i * 4) + j + 1) / 6">
                                <svg v-if="space != null" viewbox="0 0 150 150">
                                    <text
                                        x="50%"
                                        y="116"
                                        filter="url(#fancy-number)"
                                        font-size="110"
                                        text-anchor="middle"
                                        fill="#222222"
                                        font-weight="900"
                                    >
                                        {{ (i * 4) + j + 1 }}
                                    </text>
                                </svg>
                            </opacity-swap-transition>
                        </div>
                        <div class="bg-timer side bottom" />
                        <div class="bg-timer side top" />
                    </div>
                </div>
            </div>
            <div class="bg-timer layout horizontal center-horizontal strike-indicator-panel">
                <div
                    class="bg-inset layout horizontal center-vertical strike-indicator-wrapper"
                    ref="strikeIndicatorWrapper"
                >
                    <svg
                        v-for="i in 3"
                        class="strike-indicator"
                        viewBox="0 0 1000 1000"
                        :class="{
                            lit: (feudStore.feudState.state === 'WAITING_FOR_ANSWER' || feudStore.feudState.state === 'END_OF_ROUND' && feudStore.feudState.strikes != null) && feudStore.feudState.strikes! >= i,
                            flash: (feudStore.feudState.state === 'WAITING_FOR_STEAL' || feudStore.feudState.state === 'END_OF_ROUND' && feudStore.feudState.stealSuccessful === false)
                        }"
                    >
                        <use x="0" y="0" href="#strike" />
                    </svg>
                </div>
            </div>
            <div class="bg-panel" />
        </div>
        <div class="bg-panel" />
        <large-separator direction="horizontal" style="grid-column: span 3" />
    </div>
</template>

<script setup lang="ts">
import { useFeudStore } from 'client-shared/stores/FeudStore';
import LargeSeparator from 'components/LargeSeparator.vue';
import SevenSegmentDigits from 'components/SevenSegmentDigits.vue';
import { useTweenedNumber } from '../../helpers/useTweenedNumber';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import VfdPixelText from 'components/VfdPixelText.vue';
import OpacitySwapTransition from 'components/OpacitySwapTransition.vue';
import gsap from 'gsap';
import { colors } from '../../styles/colors';

const feudStore = useFeudStore();
const strikeIndicatorWrapper = ref<HTMLDivElement>();

function flashStrikeIndicator(target: gsap.TweenTarget, endAtLitColor: boolean) {
    nodecg.playSound('feud-incorrect-answer');

    const pauseDuration = 0.25;

    const tl = gsap.timeline({ repeat: endAtLitColor ? 3 : 2, repeatDelay: pauseDuration });

    tl
        .set(target, { color: endAtLitColor ? colors.vfdRedUnlit : colors.vfdRed })
        .set(target, { color: endAtLitColor ? colors.vfdRed : colors.vfdRedUnlit, delay: pauseDuration });
}

function flashMiddleStrikeIndicator() {
    flashStrikeIndicator(strikeIndicatorWrapper.value!.children.item(1), false);
}

function onCorrectAnswer() {
    nodecg.playSound('feud-correct-answer');
}

onMounted(() => {
    watch(() => feudStore.feudState, (newValue, oldValue) => {
        if (
            oldValue.state === 'WAITING_FOR_STEAL' && newValue.state === 'END_OF_ROUND' && newValue.stealSuccessful === false
            || oldValue.state === 'WAITING_FOR_ANSWER' && newValue.state === 'WAITING_FOR_STEAL'
        ) {
            flashStrikeIndicator(strikeIndicatorWrapper.value!.children, false);
        }

        if (oldValue.state === 'WAITING_FOR_ANSWER' && newValue.state === 'WAITING_FOR_ANSWER' && newValue.strikes > oldValue.strikes) {
            flashStrikeIndicator(strikeIndicatorWrapper.value!.children.item(newValue.strikes - 1), true);
        }
    });

    nodecg.listenFor('feud:noAnswerGuessedFaceoff', flashMiddleStrikeIndicator);
    nodecg.listenFor('feud:answerGuessed', onCorrectAnswer);
});

onUnmounted(() => {
    nodecg.unlisten('feud:noAnswerGuessedFaceoff', flashMiddleStrikeIndicator);
    nodecg.unlisten('feud:answerGuessed', onCorrectAnswer);
});

const tweenedGuessedAnswerValue = useTweenedNumber(() => feudStore.guessedAnswerValue, 0.6);
const boardSpaces = computed(() => {
    const result = Array.from({ length: 8 }, (_, i) => {
        const answer = feudStore.feudBoard.answers[i];
        if (answer == null) {
            return null;
        }
        return {
            ...answer,
            splitAnswer: splitAnswerText(answer.answer),
        };
    });
    // lazily split the board into 2 columns, so each column can have its own element.
    // we do this to play some CSS perspective tricks
    return [
        result.slice(0, 4),
        result.slice(4),
    ];
});

// this is a flawed algorithm (e.g. it'll probably break with long words). i just made sure all the answers i had looked fine ahead of time.
const charactersPerRow = 18;
function splitAnswerText(answer: string) {
    if (answer.length >= charactersPerRow * 2) {
        return [
            answer.substring(0, charactersPerRow),
            answer.substring(charactersPerRow, charactersPerRow * 2),
        ];
    }

    const splitAnswer = answer.split(' ');
    let firstRow = '';
    let secondRow = '';

    let cumulativeWordLength = 0;
    for (let i = 0; i < splitAnswer.length; i++) {
        const word = splitAnswer[i];
        cumulativeWordLength += word.length + (i === 0 ? 0 : 1);

        if (cumulativeWordLength > charactersPerRow) {
            secondRow += splitAnswer[i] + ' ';
        } else {
            firstRow += splitAnswer[i] + ' ';
        }
    }

    return [
        firstRow.trim(),
        secondRow.trim(),
    ];
}
</script>

<style scoped lang="scss">
@use '../../styles/colors';
@use '../../styles/constants';

.feud-board-layout {
    height: 1080px - constants.$omnibarHeight;
    display: grid;
    grid-template-columns: 1fr minmax(0, 4fr) 1fr;
    grid-template-rows: minmax(0, 1fr) 14px;
    gap: 3px;
    background-color: colors.$layout-gap;
}

.main-segment {
    display: grid;
    grid-template-rows: 0.75fr 1.25fr auto minmax(0, 0.75fr) 0.75fr;
    gap: 3px;
}

.round-score-segment {
    font-size: 5em;
}

.answers-segment {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    position: relative;
    grid-auto-flow: column;
    margin: 4px 0;

    > .column {
        display: grid;
        gap: 3px;
        perspective: 2000px;
        perspective-origin: 75% 50%;
        transform-style: preserve-3d;
        transform: translateX(2px);

        &:last-child {
            perspective-origin: 25% 50%;
            transform: translateX(-2px);
        }
    }
}

.answer {
    position: relative;
    transform-origin: center;
    transform-style: preserve-3d;
    transform: scale(0.975) rotate3d(1, 0, 0, 0deg);
    transition: transform 500ms cubic-bezier(0.37, 0, 0.63, 1);
    height: 130px;

    &.guessed {
        transform: scale(0.97) rotate3d(1, 0, 0, 180deg);

        > .answer-index {
            opacity: 0;
            transition-delay: 250ms;
        }

        > .guessed-answer {
            opacity: 1;
            transition-delay: 0ms;
        }
    }

    > .side {
        position: absolute;
        transform-origin: center;

        &.top {
            width: 100%;
            height: 60px;
            transform: translateY(-50%) rotate3d(1, 0, 0, 90deg);
        }

        &.bottom {
            top: calc(100% - 30px);
            width: 100%;
            height: 60px;
            transform: rotate3d(1, 0, 0, 90deg);
        }
    }
}

.answer-index {
    position: absolute;
    height: 100%;
    width: 100%;
    background: linear-gradient(to bottom, #FBC02D 0%, #F9A825 100%);
    transform-origin: center;
    transform: translateZ(30px);
    transition: opacity 250ms linear;
}

.guessed-answer {
    position: absolute;
    background: linear-gradient(to bottom, #FBC02D 0%, #F9A825 100%);
    height: 100%;
    width: 100%;
    transform-origin: center;
    transform: rotate3d(1, 0, 0, 180deg) translateZ(30px);
    opacity: 0;
    transition: opacity 250ms linear 250ms;
    padding: 12px 10px;

    > * {
        padding: 0 10px;
    }

    .value {
        font-size: 3.5em;
        //--lit-color: #eeeeee;
        //--unlit-color: #222222;
        margin-top: 3px;
    }

    .value-label {
        color: colors.$vfd-teal;
        font-weight: 700;
        font-size: 20px;
        margin-top: 2px;
    }
}

.strike-indicator-panel {
    padding: 8px 0;
}

.strike-indicator-wrapper {
    padding: 0 4px;
}

.strike-indicator {
    color: colors.$vfd-red-unlit;
    font-weight: 900;
    height: 100%;
    transition: color 50ms linear;
    margin-top: -1px;

    &.lit {
        color: colors.$vfd-red;
    }
}
</style>
