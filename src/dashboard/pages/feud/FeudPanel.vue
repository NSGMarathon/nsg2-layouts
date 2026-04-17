<template>
    <div class="feud-panel">
        <ipl-message
            v-if="!hasConfig"
            type="error"
        >
            Missing feud config
        </ipl-message>
        <template v-else>
            <ipl-space
                v-if="feudStore.feudState.state === 'WAITING_FOR_QUESTION'"
                class="layout vertical center-horizontal"
            >
                <error-display class="m-b-8" />
                <ipl-select
                    v-model="selectedQuestion"
                    :options="questionOptions"
                    label="Question"
                />
                <ipl-select
                    v-model="answerCount"
                    :options="answerCountOptions"
                    label="Number of answers"
                    class="m-t-4"
                    style="width: 10em"
                />
                <div class="layout horizontal m-t-8">
                    <ipl-button
                        label="Set up teams"
                        class="m-r-8"
                        style="width: 10em"
                        @click="$refs.teamManagementDialog!.open()"
                    />
                    <ipl-button
                        label="Start round"
                        color="green"
                        style="width: 10em"
                        async
                        @click="chooseQuestion"
                    />
                </div>
            </ipl-space>
            <div
                v-else
                class="page-layout"
            >
                <div class="grow" />
                <div class="layout horizontal center-vertical board-header m-b-8">
                    <ipl-space>
                        {{ feudStore.feudTeamInfo.teamA.score }}
                    </ipl-space>
                    <div class="grow">
                        <div>
                            Round {{ feudStore.feudBoard.roundNumber }}
                            <template v-if="feudStore.feudBoard.roundNumber === 3">(2x score!)</template>
                            <template v-else-if="feudStore.feudBoard.roundNumber === 4">(3x score!)</template>
                        </div>
                        <div>{{ feudStore.feudBoard.question }}</div>
                        <div class="m-t-2 round-state">
                            <template v-if="feudStore.feudState.state === 'WAITING_FOR_BUZZER'">
                                Waiting for buzzer...
                            </template>
                            <template v-else-if="feudStore.feudState.state === 'WAITING_FOR_PLAY_OR_PASS'">
                                <span :class="getTeamColor(feudStore.feudState.faceoffWinner)">{{ getTeamName(feudStore.feudState.faceoffWinner) }}</span> wins face-off - Play or pass?
                            </template>
                            <template v-else-if="feudStore.feudState.state === 'WAITING_FOR_FACEOFF_ANSWER'">
                                Face-off: <span :class="getTeamColor(feudStore.feudState.teamInPlay)">{{ getTeamName(feudStore.feudState.teamInPlay) }}</span> guesses
                            </template>
                            <template v-else-if="feudStore.feudState.state === 'WAITING_FOR_ANSWER'">
                                <span :class="getTeamColor(feudStore.feudState.teamInPlay)">{{ getTeamName(feudStore.feudState.teamInPlay) }}</span> guesses - {{ pluralize('strike', feudStore.feudState.strikes) }} - {{ pluralize('point', feudStore.guessedAnswerValue) }}
                            </template>
                            <template v-else-if="feudStore.feudState.state === 'WAITING_FOR_STEAL'">
                                <span :class="getTeamColor(feudStore.feudState.teamInPlay)">{{ getTeamName(feudStore.feudState.teamInPlay) }}</span> steals - {{ pluralize('point', feudStore.guessedAnswerValue) }}
                            </template>
                            <template v-else-if="feudStore.feudState.state === 'END_OF_ROUND'">
                                End of round - <span :class="getTeamColor(feudStore.feudState.winner)">{{ getTeamName(feudStore.feudState.winner) }}</span> wins!
                            </template>
                        </div>
                    </div>
                    <ipl-space>
                        {{ feudStore.feudTeamInfo.teamB.score }}
                    </ipl-space>
                </div>
                <div class="m-t-8 board-layout">
                    <ipl-space
                        v-for="(space, i) of boardSpaces"
                        clickable
                        :disabled="space == null || space.guessed || !canClickAnyBoardSpace"
                        @click="markAnswerGuessed(i)"
                    >
                        <template v-if="space != null && (space.guessed || showAnswers)">
                            <span
                                class="answer"
                                :class="{ guessed: space.guessed }"
                            >
                                {{ space.answer }}
                            </span>
                            <br>
                            {{ pluralize('point', space.value) }}
                        </template>
                        <div
                            v-else-if="i < feudStore.feudBoard.answers.length"
                            class="answer-index"
                        >
                            {{ i + 1 }}
                        </div>
                    </ipl-space>
                    <div
                        v-if="feudStore.feudState.state === 'WAITING_FOR_BUZZER' || feudStore.feudState.state === 'WAITING_FOR_PLAY_OR_PASS'"
                        class="board-overlay"
                    >
                        <ipl-space>
                            <template v-if="feudStore.feudState.state === 'WAITING_FOR_BUZZER'">
                                <div class="title">Who buzzed in?</div>
                                <div class="layout horizontal">
                                    <ipl-button
                                        class="m-r-8"
                                        @click="setBuzzerWinner('teamA')"
                                    >
                                        {{ getTeamName('teamA') }} buzzed first
                                    </ipl-button>
                                    <ipl-button
                                        color="red"
                                        @click="setBuzzerWinner('teamB')"
                                    >
                                        {{ getTeamName('teamB') }} buzzed first
                                    </ipl-button>
                                </div>
                                <small class="d-block text-center text-low-emphasis m-t-8">(Should work automatically.)</small>
                            </template>
                            <template v-else-if="feudStore.feudState.state === 'WAITING_FOR_PLAY_OR_PASS'">
                                <div class="title">Play or pass?</div>
                                <div class="layout horizontal">
                                    <ipl-button
                                        :color="feudStore.feudState.faceoffWinner === 'teamA' ? 'blue' : 'red'"
                                        class="m-r-8 max-width"
                                        @click="completePlayOrPass(feudStore.feudState.faceoffWinner)"
                                    >
                                        Play<br>
                                        {{ getTeamName(feudStore.feudState.faceoffWinner) }} gets the board
                                    </ipl-button>
                                    <ipl-button
                                        :color="feudStore.feudState.faceoffWinner === 'teamA' ? 'red' : 'blue'"
                                        class="max-width"
                                        @click="completePlayOrPass(getOpponent(feudStore.feudState.faceoffWinner))"
                                    >
                                        Pass<br>
                                        {{ getTeamName(getOpponent(feudStore.feudState.faceoffWinner)) }} gets the board
                                    </ipl-button>
                                </div>
                            </template>
                        </ipl-space>
                    </div>
                </div>
                <ipl-space
                    class="m-t-8 layout vertical center-vertical"
                    style="min-height: 6em"
                >
                    <div class="layout horizontal">
                        <template v-if="feudStore.feudState.state === 'END_OF_ROUND'">
                            <ipl-button
                                v-if="allAnswersGuessed"
                                label="Start new round"
                                color="yellow"
                                style="max-width: 18em; margin: 0 auto"
                                @click="startNewRound"
                            />
                            <ipl-button
                                v-else
                                label="Reveal remaining answer"
                                color="yellow"
                                style="max-width: 18em; margin: 0 auto"
                                @click="revealLowestAnswerNotGuessed"
                            />
                        </template>
                        <ipl-button
                            v-else
                            label="Incorrect guess"
                            color="yellow"
                            :disabled="feudStore.feudState.state !== 'WAITING_FOR_FACEOFF_ANSWER' && feudStore.feudState.state !== 'WAITING_FOR_ANSWER' && feudStore.feudState.state !== 'WAITING_FOR_STEAL'"
                            style="max-width: 15em; margin: 0 auto"
                            @click="markNoAnswerGuessed"
                        />
                    </div>
                    <div
                        v-if="feudStore.feudState.state === 'WAITING_FOR_FACEOFF_ANSWER'"
                        class="m-t-8 layout horizontal center-horizontal"
                    >
                        <ipl-button
                            v-slot="{ state }"
                            color="red"
                            style="max-width: 15em"
                            class="m-r-8"
                            requires-confirmation
                            @click="undoBuzzer"
                        >
                            <font-awesome-icon icon="undo" /> {{ state === 'confirm' ? 'CONFIRM?' : 'BUZZ AGAIN' }}
                        </ipl-button>
                        <ipl-button
                            v-slot="{ state }"
                            color="red"
                            style="max-width: 15em"
                            requires-confirmation
                            @click="startNewRound"
                        >
                            <font-awesome-icon icon="cancel" /> {{ state === 'confirm' ? 'CONFIRM?' : 'NEW ROUND' }}
                        </ipl-button>
                    </div>
                </ipl-space>
                <div class="grow layout vertical center-vertical center-horizontal m-t-8">
                    <ipl-space style="width: 10em;">
                        <div class="title">Answers</div>
                        <ipl-toggle v-model="showAnswers" style="height: 2.5em" />
                    </ipl-space>
                </div>
            </div>
            <feud-team-management-dialog ref="teamManagementDialog" />
        </template>
    </div>
</template>

<script setup lang="ts">
import { IplButton, IplMessage, IplSelect, IplSpace, IplToggle, pluralize } from '@iplsplatoon/vue-components';
import { feudConfig, useFeudStore } from 'client-shared/stores/FeudStore';
import { computed, ref } from 'vue';
import FeudTeamManagementDialog from './FeudTeamManagementDialog.vue';
import ErrorDisplay from '../../components/ErrorDisplay.vue';
import { sendMessage } from 'client-shared/helpers/NodecgHelper';
import { FeudTeam } from 'types/feud';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faUndo } from '@fortawesome/free-solid-svg-icons/faUndo';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faCancel } from '@fortawesome/free-solid-svg-icons/faCancel';

library.add(faUndo, faCancel);

const feudStore = useFeudStore();

const hasConfig = feudConfig != null && feudConfig.length > 0;

const selectedQuestion = ref('0');
const questionOptions = (feudConfig ?? []).map((question, i) => ({
    name: `${question.internalRoundName} - ${question.question}`,
    value: String(i),
}));

const answerCount = ref('8');
const answerCountOptions = [
    { name: '8', value: '8' },
    { name: '7', value: '7' },
    { name: '6', value: '6' },
    { name: '5', value: '5' },
    { name: '4', value: '4' },
];

const boardSpaces = computed(() => Array.from({ length: 8 }, (_, i) => feudStore.feudBoard.answers[i] ?? null));
const canClickAnyBoardSpace = computed(() => {
    switch (feudStore.feudState.state) {
        case 'WAITING_FOR_ANSWER':
            return true;
        case 'WAITING_FOR_FACEOFF_ANSWER':
            return true;
        case 'WAITING_FOR_STEAL':
            return true;
        default:
            return false
    }
});

const allAnswersGuessed = computed(() => feudStore.feudBoard.answers.every((answer) => answer.guessed));

const showAnswers = ref(true);

function getOpponent(team: FeudTeam): FeudTeam {
    return team === 'teamA' ? 'teamB' : 'teamA';
}

function getTeamColor(team: FeudTeam) {
    return team === 'teamA' ? 'team-color-a' : 'team-color-b';
}

function getTeamName(team: FeudTeam) {
    return team === 'teamA' ? 'Team 1' : 'Team 2';
}

async function chooseQuestion() {
    await sendMessage('feud:chooseQuestion', { questionIndex: Number(selectedQuestion.value), boardSize: Number(answerCount.value) });
}

async function markAnswerGuessed(index: number) {
    await sendMessage('feud:markAnswerGuessed', { answerIndex: index });
}

async function markNoAnswerGuessed() {
    await sendMessage('feud:markNoAnswerGuessed');
}

async function setBuzzerWinner(team: FeudTeam) {
    await sendMessage('feud:setBuzzerWinner', { team });
}

async function completePlayOrPass(team: FeudTeam) {
    await sendMessage('feud:completePlayOrPass', { teamToPlay: team });
}

async function revealLowestAnswerNotGuessed() {
    await sendMessage('feud:revealLowestAnswerNotGuessed');
}

async function startNewRound() {
    await sendMessage('feud:startNewRound');
}

async function undoBuzzer() {
    await sendMessage('feud:undoBuzzer');
}
</script>

<style>
body {
    margin: 0 !important;
    overflow-y: hidden;
}
</style>

<style scoped>
.feud-panel {
    height: 100vh;
    padding: 8px;
    overflow-x: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5em;
}

.team-color-a {
    color: #0090FF;
}

.team-color-b {
    color: #E74E36;
}

.page-layout {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
    width: 40em;
    max-width: 95dvw;
}

.board-header {
    gap: 12px;
    text-align: center;

    > *:first-child, > *:last-child {
        font-weight: 700;
        min-width: 2em;
        text-align: center;
        font-size: 2em;
    }
}

.round-state {
    font-size: 1.25em;
    font-weight: 700;
}

.board-layout {
    display: grid;
    gap: 8px;
    grid-template-rows: repeat(4, 1fr);
    grid-template-columns: repeat(2, minmax(0, 1fr));
    position: relative;
    grid-auto-flow: column;

    > * {
        min-height: 3.2em;

        &:disabled {
            opacity: 0.75;
        }
    }
}

.answer-index {
    font-size: 1.75em;
    font-weight: 700;
    text-align: center;
}

.board-overlay {
    position: absolute;
    width: calc(100% - 48px);
    height: calc(100% - 48px);
    left: 0;
    top: 0;
    background-color: rgba(34, 34, 34, 0.75);
    padding: 24px;
    border-radius: 7px;
    display: flex;
    justify-content: center;
    align-items: center;
}

.answer {
    font-size: 1.1em;
    font-weight: 700;

    &.guessed {
        color: #00A651;
    }
}
</style>
