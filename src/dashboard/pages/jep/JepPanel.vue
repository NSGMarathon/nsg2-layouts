<template>
    <div class="jep-panel">
        <error-display class="error-display" />
        <ipl-space class="controls layout horizontal">
            <ipl-button
                v-if="jepStore.jepBoard.usingTestBoard"
                color="red"
                icon="exclamation"
                class="m-r-8"
                title="Mostly complete the board"
                @click="mostlyCompleteTestBoard"
            />
            <ipl-button
                icon="user-edit"
                title="Edit contestants"
                @click="contestantManagementDialog?.open"
            />
        </ipl-space>
        <div
            v-if="jepStore.jepState.state === 'WAITING_FOR_CONTESTANT_INFO'"
            class="layout vertical center-horizontal"
        >
            <div class="m-b-8">Welcome to Jeopardy!</div>
            <ipl-button @click="contestantManagementDialog?.open">
                <font-awesome-icon icon="user-edit" />
                Edit contestants
            </ipl-button>
        </div>
        <div
            v-else-if="jepStore.jepState.state === 'STARTING_NEXT_ROUND'"
            class="layout vertical center-horizontal"
        >
            <div class="m-b-8">Starting a new round...</div>
            <ipl-button
                color="green"
                @click="revealCategory"
            >
                Ready!
            </ipl-button>
        </div>
        <div
            v-else
            class="layout vertical"
            style="width: 40em"
        >
            <div
                v-if="jepStore.jepBoard.round !== 'FINAL_JEOPARDY'"
                class="board-display"
                :style="{ '--row-count': JEP_CLUES_PER_CATEGORY + 1 }"
            >
                <ipl-space
                    v-if="selectedClue != null"
                    class="selected-clue-overlay"
                >
                    <div class="category">
                        {{ selectedClue.categoryName }} {{ selectedClue.value }} {{ selectedClue.isDailyDouble ? ' - Daily Double!' : '' }}
                    </div>
                    <div class="prompt">
                        {{ selectedClue.prompt }}
                        <div class="answer-label">Answer:</div>
                        <div class="answer">
                            {{ selectedClue.answer }}
                        </div>
                    </div>
                    <div />
                </ipl-space>
                <template v-for="(cat, i) of jepStore.jepBoard.categories">
                    <ipl-space
                        class="category-name layout horizontal center-vertical center-horizontal"
                        :class="{ 'next-category-to-reveal': jepStore.jepState.state === 'REVEALING_CATEGORIES' && jepStore.jepState.lastRevealedCategoryIndex + 1 === i }"
                    >
                        {{ jepStore.jepState.state !== 'REVEALING_CATEGORIES' || jepStore.jepState.lastRevealedCategoryIndex + 1 >= i ? cat.name : '???' }}
                    </ipl-space>
                    <ipl-space
                        v-for="(clue, j) of cat.clues"
                        clickable
                        :disabled="clue.answered"
                        :color="selectedClue != null && selectedClue.position[0] === i && selectedClue.position[1] === j ? 'blue' : 'primary'"
                        @click="pickClue([i, j])"
                    >
                        {{ jepStore.getClueValue(j) }}
                    </ipl-space>
                </template>
            </div>
            <ipl-space
                v-else-if="
                    jepStore.jepState.state === 'REVEALING_CATEGORIES' ||
                    jepStore.jepState.state === 'FINAL_JEP_READING_CLUE' ||
                    jepStore.jepState.state === 'FINAL_JEP_AWAITING_WAGERS'
                "
                class="final-jeopardy-display"
            >
                <div class="category-reveal-title">
                    <template v-if="jepStore.jepState.state === 'REVEALING_CATEGORIES' || jepStore.jepState.state === 'FINAL_JEP_AWAITING_WAGERS'">
                        The Final Jeopardy category is...
                    </template>
                    <template v-else>
                        Final Jeopardy - {{ finalJeopardyData?.categoryName }}
                    </template>
                </div>
                <div
                    v-if="jepStore.jepState.state === 'REVEALING_CATEGORIES' || jepStore.jepState.state === 'FINAL_JEP_AWAITING_WAGERS'"
                    class="category-reveal"
                >
                    {{ finalJeopardyData?.categoryName }}
                </div>
                <div
                    v-else
                    class="prompt-reveal"
                >
                    {{ finalJeopardyData?.prompt }}
                </div>
                <div>
                    <template v-if="jepStore.jepState.state === 'FINAL_JEP_AWAITING_WAGERS'">
                        Waiting for wagers...
                    </template>
                </div>
            </ipl-space>
            <div
                v-else-if="jepStore.jepState.state === 'FINAL_JEP_AWAITING_ANSWERS' || jepStore.jepState.state === 'FINAL_JEP_REVEALING_ANSWERS'"
                class="final-jeopardy-answer-section"
            >
                <ipl-space
                    v-for="(result, i) of finalJeopardyResults"
                >
                    <jep-contestant-indicator :contestant-index="i" style="display: block" />

                    <jep-wager-input
                        v-model="result.wager"
                        :max="result.maxWager ?? 0"
                        :name="`finalJeopardyWager_${i}`"
                        :disabled="result.submitted"
                        class="m-t-8"
                    />

                    <ipl-button
                        v-slot="{ state }"
                        class="m-t-32"
                        :disabled="result.submitted"
                        color="green"
                        :requires-confirmation="result.wager === 0"
                        @click="finalJepRevealAnswer(i, result.wager, true)"
                    >
                        {{ state === 'confirm' ? 'Are you sure?' : 'Correct!' }}
                    </ipl-button>
                    <ipl-button
                        v-slot="{ state }"
                        class="m-t-32"
                        :disabled="result.submitted"
                        color="red"
                        :requires-confirmation="result.wager === 0"
                        @click="finalJepRevealAnswer(i, result.wager, false)"
                    >
                        {{ state === 'confirm' ? 'Are you sure?' : 'Incorrect' }}
                    </ipl-button>
                </ipl-space>
            </div>
            <ipl-space class="board-actions m-t-16 layout vertical center-horizontal center-vertical">
                <ipl-button
                    v-if="jepStore.jepState.state === 'REVEALING_CATEGORIES'"
                    @click="revealCategory"
                >
                    {{ jepStore.jepState.lastRevealedCategoryIndex === JEP_CLUES_PER_CATEGORY ? 'Continue' : jepStore.jepBoard.round === 'FINAL_JEOPARDY' ? 'Reveal the category' : 'Reveal a category' }}
                </ipl-button>
                <div v-else-if="jepStore.jepState.state === 'PICKING_CLUE'">
                    <jep-contestant-indicator :contestant-index="jepStore.jepState.pickingContestantIndex" /> picks a clue
                </div>
                <div v-else-if="jepStore.jepState.state === 'PREPARING_CLUE'">
                    {{ jepStore.jepState.buzzerEnabled ? 'Waiting for a player to buzz in...' : 'Waiting for the buzzers to be armed...' }}
                </div>
                <template v-else-if="jepStore.jepState.state === 'AWAITING_ANSWER' || jepStore.jepState.state === 'DAILY_DOUBLE_AWAITING_ANSWER'">
                    <div class="m-b-8"><jep-contestant-indicator :contestant-index="jepStore.jepState.state === 'AWAITING_ANSWER' ? jepStore.jepState.buzzedByIndex : jepStore.jepState.lastCluePickedByIndex" /> to answer</div>
                </template>
                <template v-else-if="jepStore.jepState.state === 'READING_CORRECT_ANSWER'">
                    <div class="m-b-8">Reading out the correct answer...</div>
                    <ipl-button @click="finishReadingAnswer">
                        Continue
                    </ipl-button>
                </template>
                <form
                    v-else-if="jepStore.jepState.state === 'DAILY_DOUBLE_AWAITING_WAGER'"
                    style="display: contents"
                    @submit.prevent
                >
                    <div class="layout horizontal">
                        <jep-wager-input
                            v-model="dailyDoubleWager"
                            :max="maxDailyDoubleWager ?? 0"
                            name="dailyDoubleWager"
                            ref="dailyDoubleWagerInput"
                        />
                        <ipl-button
                            @click="makeDailyDoubleWager"
                            color="green"
                            style="width: 6em;"
                            class="m-l-64"
                            :disabled="!dailyDoubleWagerValid"
                        >
                            <font-awesome-icon icon="check" /><br>
                            Continue
                        </ipl-button>
                    </div>
                </form>
                <template v-else-if="jepStore.jepState.state === 'FINAL_JEP_AWAITING_WAGERS'">
                    <ipl-button @click="finalJepFinishWagering">
                        Continue
                    </ipl-button>
                </template>
                <template v-else-if="jepStore.jepState.state === 'FINAL_JEP_READING_CLUE'">
                    <ipl-button @click="finalJepFinishReadingClue">
                        Finish reading
                    </ipl-button>
                </template>
                <template v-else-if="jepStore.jepState.state === 'FINAL_JEP_AWAITING_ANSWERS' || jepStore.jepState.state === 'FINAL_JEP_REVEALING_ANSWERS'">
                    <div class="prompt m-b-16">{{ finalJeopardyData?.prompt }}</div>
                    <div class="answer-label">Answer:</div>
                    <div class="answer">
                        {{ finalJeopardyData?.answer }}
                    </div>
                </template>
                <template v-else-if="jepStore.jepState.state === 'VIEW_FINAL_RESULT'">
                    It's over!
                </template>
            </ipl-space>
            <div class="contestant-list m-t-16">
                <ipl-space
                    v-for="(contestant, i) of jepStore.jepContestants"
                    :color="focusedContestantIndex === i ? 'blue' : 'primary'"
                    :class="{ 'guess-made': (jepStore.jepState.state === 'AWAITING_ANSWER' || jepStore.jepState.state === 'PREPARING_CLUE') && jepStore.jepState.guessesMadeByIndices.includes(i) }"
                >
                    <jep-contestant-indicator :contestant-index="i" />
                    <div class="contestant-score">{{ contestant.score }}</div>
                </ipl-space>
            </div>
        </div>
        <div />
    </div>
    <jep-contestant-management-dialog ref="contestantManagementDialog" />
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';
import { IplButton, IplInput, IplSpace } from '@iplsplatoon/vue-components';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faUserEdit } from '@fortawesome/free-solid-svg-icons/faUserEdit';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import JepContestantManagementDialog from './JepContestantManagementDialog.vue';
import { useJepStore } from 'client-shared/stores/JepStore';
import { sendMessage } from 'client-shared/helpers/NodecgHelper';
import ErrorDisplay from '../../components/ErrorDisplay.vue';
import {
    JEP_CLUE_VALUE_MULTIPLIER,
    JEP_CLUES_PER_CATEGORY,
    JEP_DAILY_DOUBLE_MIN_WAGER,
    JEP_FINAL_JEOPARDY_MIN_MAX_WAGER_SIZE
} from 'shared/JepConstants';
import JepContestantIndicator from './JepContestantIndicator.vue';
import { CluePosition } from 'types/schemas/jepState';
import { faExclamation } from '@fortawesome/free-solid-svg-icons/faExclamation';
import { DateTime } from 'luxon';
import JepWagerInput from './JepWagerInput.vue';
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck';

library.add(faUserEdit, faExclamation, faCheck);

const jepStore = useJepStore();

const contestantManagementDialog = useTemplateRef('contestantManagementDialog');
const dailyDoubleWagerInput = useTemplateRef('dailyDoubleWagerInput');
const dailyDoubleWager = ref(0);
const finalJeopardyResults = ref<{ maxWager: number | null, wager: number, submitted: boolean }[]>([]);

// todo: some kind of read-only mode for the host to stare at
// const parsedUpdateTime = computed(() => DateTime.fromISO(jepStore.jepState.lastUpdated));

const focusedContestantIndex = computed(() => {
    switch (jepStore.jepState.state) {
        case 'AWAITING_ANSWER':
            return jepStore.jepState.buzzedByIndex;
        case 'DAILY_DOUBLE_AWAITING_WAGER':
        case 'DAILY_DOUBLE_AWAITING_ANSWER':
            return jepStore.jepState.lastCluePickedByIndex;
        case 'PICKING_CLUE':
            return jepStore.jepState.pickingContestantIndex;
        default:
            return -1;
    }
});

const selectedClue = computed(() => {
    if ('cluePosition' in jepStore.jepState) {
        const cluePos = jepStore.jepState.cluePosition as CluePosition;
        const category = jepStore.jepBoard.categories[cluePos[0]];
        if (category != null) {
            return {
                position: cluePos,
                categoryName: category.name,
                value: jepStore.getClueValue(cluePos[1]),
                ...category.clues[cluePos[1]]
            };
        }
    }

    return null;
});

const finalJeopardyData = computed(() => {
    if (jepStore.jepBoard.round !== 'FINAL_JEOPARDY') {
        return null;
    }

    return {
        categoryName: jepStore.jepBoard.categories[0].name,
        ...jepStore.jepBoard.categories[0].clues[0]
    }
});

const maxDailyDoubleWager = computed(() => jepStore.jepState.state === 'DAILY_DOUBLE_AWAITING_WAGER' ? Math.max(
    (JEP_CLUE_VALUE_MULTIPLIER * (jepStore.jepBoard.round === 'DOUBLE_JEOPARDY' ? 2 : 1) * JEP_CLUES_PER_CATEGORY),
    jepStore.jepContestants[jepStore.jepState.lastCluePickedByIndex].score) : null);

const dailyDoubleWagerValid = computed(() => dailyDoubleWager.value >= JEP_DAILY_DOUBLE_MIN_WAGER && dailyDoubleWager.value <= (maxDailyDoubleWager.value ?? 0));

watch(() => jepStore.jepState, (newValue, oldValue) => {
    if (newValue.state === 'DAILY_DOUBLE_AWAITING_WAGER') {
        dailyDoubleWager.value = 0;
        nextTick(() => {
            dailyDoubleWagerInput.value?.focus();
        });
    }

    if (newValue.state === 'FINAL_JEP_AWAITING_ANSWERS' || newValue.state === 'FINAL_JEP_REVEALING_ANSWERS') {
        finalJeopardyResults.value = newValue.finalJeopardyWagers.map((wager) => ({
            maxWager: Math.max(JEP_FINAL_JEOPARDY_MIN_MAX_WAGER_SIZE, Math.abs(wager.scoreBeforeAnswer)),
            wager: wager.answerRevealed ? wager.amountWagered : 0,
            submitted: wager.answerRevealed
        }));
    } else if (oldValue?.state === 'VIEW_FINAL_RESULT') {
        finalJeopardyResults.value = [];
    }
}, { immediate: true });

async function revealCategory() {
    await sendMessage('jep:revealCategory');
}

async function pickClue(position: CluePosition) {
    if (jepStore.jepState.state === 'PICKING_CLUE') {
        await sendMessage('jep:pickClue', position);
    }
}

async function finishReadingAnswer() {
    await sendMessage('jep:finishReadingAnswer');
}

async function makeDailyDoubleWager() {
    await sendMessage('jep:makeDailyDoubleWager', { amount: dailyDoubleWager.value });
    dailyDoubleWager.value = 0;
}

async function mostlyCompleteTestBoard() {
    await sendMessage('jep:mostlyCompleteTestBoard');
}

async function finalJepFinishWagering() {
    await sendMessage('finalJep:finishWagering');
}

async function finalJepFinishReadingClue() {
    await sendMessage('finalJep:finishReadingClue');
}

async function finalJepRevealAnswer(contestantIndex: number, amountWagered: number, isCorrect: boolean) {
    await sendMessage('finalJep:revealAnswer', { contestantIndex, amountWagered, isCorrect });
    finalJeopardyResults.value[contestantIndex].submitted = true;
}
</script>

<style scoped lang="scss">
.jep-panel {
    height: 100vh;
    padding: 8px;
    overflow-x: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    font-size: 1.5em;
}

.controls {
    align-self: flex-end;
    font-size: 0.75em;
}

.error-display {
    position: fixed;
    bottom: 8px;
    right: 8px;
}

.board-actions {
    min-height: 7em;
    text-align: center;
    overflow-wrap: anywhere;

    .ipl-button {
        width: 10em;
    }
}

.board-display {
    display: grid;
    grid-template-rows: repeat(var(--row-count), auto);
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, 1fr);
    gap: 8px;
    position: relative;

    > * {
        text-align: center !important;
        font-size: 1.5em !important;
        font-weight: 700;

        &.category-name {
            font-size: 1em !important;
            overflow-wrap: anywhere;
            position: relative;

            &.next-category-to-reveal {
                outline: 2px solid #fff;

                &:before {
                    content: 'Next:';
                    font-size: 0.75em;
                    position: absolute;
                    top: -1.2em;
                    left: 0;
                }
            }
        }

        &:disabled {
            opacity: 0.25;
        }
    }
}

.selected-clue-overlay {
    position: absolute;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    z-index: 2;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;

    .category {
        font-size: 0.75em;
        font-weight: 400;
        width: auto;
        text-align: center;
        padding: 0 8px;
        border-bottom: 1px solid var(--ipl-input-color);
    }

    .prompt {
        font-size: 1.5em;
        overflow-wrap: anywhere;
    }

    .answer-label {
        margin-top: 0.75em;
        color: var(--ipl-input-color);
        font-weight: 400;
        font-size: 0.5em;
    }

    .answer {
        font-weight: 400;
        font-size: 0.75em;
    }
}

.final-jeopardy-answer-section {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, 1fr);
    gap: 8px;
}

.final-jeopardy-display {
    min-height: 12em;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;

    > .category-reveal-title {
        font-size: 1.125em;
        font-weight: 400;
        width: auto;
        text-align: center;
        padding: 0 8px;
        border-bottom: 1px solid var(--ipl-input-color);
    }

    > .category-reveal, > .prompt-reveal {
        text-align: center;
        overflow-wrap: anywhere;
        font-weight: 700;
    }

    > .category-reveal {
        font-size: 2em;
    }

    > .prompt-reveal {
        font-size: 1.5em;
    }
}

.answer-label {
    color: var(--ipl-input-color);
    font-weight: 400;
    font-size: 0.75em;
}

.answer {
    font-weight: 400;
    font-size: 1.125em;
}

.contestant-list {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, 1fr);
    gap: 8px;
    overflow: hidden;

    > * {
        display: flex;
        align-items: center;
        justify-content: space-between;

        > .contestant-score {
            font-weight: 700;
        }

        &.guess-made {
            opacity: 0.5;

            > .contestant-indicator {
                text-decoration: line-through;
            }
        }
    }
}
</style>
