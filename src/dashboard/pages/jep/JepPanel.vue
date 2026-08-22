<template>
    <div class="jep-panel">
        <error-display class="error-display" />
        <ipl-space
            v-if="!isReadOnly"
            class="controls layout horizontal"
        >
            <template v-if="showDirectorControls">
                <ipl-button
                    color="red"
                    :disabled="jepStore.jepOverlays.scoreOverlayMode === 'NONE'"
                    class="m-r-8"
                    style="white-space: nowrap"
                    @click="jepStore.setScoreOverlayMode('NONE')"
                >
                    <font-awesome-icon icon="xmark" />
                    No names
                </ipl-button>
                <ipl-button
                    color="blue"
                    :disabled="jepStore.jepOverlays.scoreOverlayMode === 'COMPACT'"
                    class="m-r-8"
                    style="white-space: nowrap"
                    @click="jepStore.setScoreOverlayMode('COMPACT')"
                >
                    <font-awesome-icon icon="address-card" />
                    Compact
                </ipl-button>
                <ipl-button
                    color="blue"
                    :disabled="jepStore.jepOverlays.scoreOverlayMode === 'FULL'"
                    class="m-r-32"
                    @click="jepStore.setScoreOverlayMode('FULL')"
                >
                    Full
                </ipl-button>
            </template>
            <ipl-button
                icon="rotate-left"
                title="Undo last action"
                :disabled="!canUndo"
                color="red"
                class="m-r-8"
                @click="undoLastAction"
            />
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
        <div v-else />

        <div
            v-if="jepStore.jepState.state === 'WAITING_FOR_CONTESTANT_INFO'"
            class="layout vertical center-horizontal"
        >
            <div class="m-b-8">Welcome to Jeopardy!</div>
            <ipl-button
                v-if="!isReadOnly"
                @click="contestantManagementDialog?.open"
            >
                <font-awesome-icon icon="user-edit" />
                Edit contestants
            </ipl-button>
        </div>

        <div
            v-else-if="jepStore.jepState.state === 'STARTING_NEXT_ROUND'"
            class="layout vertical center-horizontal"
        >
            <div>Starting a new round...</div>
            <ipl-button
                v-if="!isReadOnly"
                color="green"
                class="m-t-8"
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
                <jep-dashboard-clue-display
                    v-if="jepStore.selectedClue != null"
                    :title="`${jepStore.selectedClue.categoryName} ${jepStore.selectedClue.value}${jepStore.selectedClue.isDailyDouble ? ' - Daily Double!' : ''}`"
                    :prompt="jepStore.selectedClue.prompt"
                    :answer="jepStore.selectedClue.answer"
                    class="selected-clue-overlay"
                />
                <template v-for="(cat, i) of jepStore.jepBoard.categories">
                    <ipl-space
                        class="category-name layout horizontal center-vertical center-horizontal"
                        :class="{ 'smaller': (revealedCategories[i]?.length ?? 0) >= 18 }"
                    >
                        {{ revealedCategories[i] ?? '???' }}
                    </ipl-space>
                    <ipl-space
                        v-for="(clue, j) of cat.clues"
                        :clickable="!isReadOnly"
                        :inert="jepStore.selectedClue != null"
                        :disabled="clue.answered"
                        :color="jepStore.selectedClue != null && jepStore.selectedClue.position[0] === i && jepStore.selectedClue.position[1] === j ? 'blue' : 'primary'"
                        :class="{ answered: clue.answered }"
                        @click="pickClue([i, j])"
                    >
                        {{ jepStore.getClueValue(j) }}
                    </ipl-space>
                </template>
            </div>
            <jep-dashboard-clue-display
                v-else-if="jepStore.jepState.state === 'REVEALING_CATEGORIES' || jepStore.jepState.state === 'FINAL_JEP_AWAITING_WAGERS'"
                title="The Final Jeopardy category is..."
                :prompt="jepStore.finalJeopardyClue?.categoryName ?? ''"
                class="final-jeopardy-display"
            />
            <jep-dashboard-clue-display
                v-else-if="
                    jepStore.jepState.state === 'FINAL_JEP_READING_CLUE' ||
                    isReadOnly && (jepStore.jepState.state === 'FINAL_JEP_AWAITING_ANSWERS' || jepStore.jepState.state === 'FINAL_JEP_REVEALING_ANSWERS')
                "
                :title="`Final Jeopardy - ${jepStore.finalJeopardyClue?.categoryName}`"
                :prompt="jepStore.finalJeopardyClue?.prompt ?? ''"
                :answer="jepStore.finalJeopardyClue?.answer ?? ''"
                class="final-jeopardy-display"
            />
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
            <ipl-space class="show-timer">
                {{ timeSinceLastUpdate }}
            </ipl-space>
            <jep-read-only-dashboard-actions v-if="isReadOnly" />
            <jep-dashboard-actions
                v-else
                :is-director="showDirectorControls"
            />
            <div class="contestant-list m-t-16">
                <ipl-space
                    v-for="(contestant, i) of jepStore.jepContestants"
                    :color="jepStore.focusedContestantIndex === i ? 'blue' : 'primary'"
                    :class="{ 'guess-made': (jepStore.jepState.state === 'AWAITING_ANSWER' || jepStore.jepState.state === 'PREPARING_CLUE') && jepStore.jepState.guessesMadeByIndices.includes(i) }"
                >
                    <jep-contestant-indicator :contestant-index="i" />
                    <div
                        class="contestant-score"
                        :class="{ 'is-negative': contestant.score < 0 }"
                    >
                        {{ contestant.score }}
                    </div>
                </ipl-space>
            </div>
        </div>
        <div />
    </div>
    <jep-contestant-management-dialog ref="contestantManagementDialog" />
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue';
import { IplButton, IplSpace } from '@iplsplatoon/vue-components';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faUserEdit } from '@fortawesome/free-solid-svg-icons/faUserEdit';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import JepContestantManagementDialog from './JepContestantManagementDialog.vue';
import { useJepStore } from 'client-shared/stores/JepStore';
import { sendMessage } from 'client-shared/helpers/NodecgHelper';
import ErrorDisplay from '../../components/ErrorDisplay.vue';
import { JEP_CLUES_PER_CATEGORY, JEP_FINAL_JEOPARDY_MIN_MAX_WAGER_SIZE } from 'shared/JepConstants';
import JepContestantIndicator from './JepContestantIndicator.vue';
import { CluePosition } from 'types/schemas/jepState';
import { faExclamation } from '@fortawesome/free-solid-svg-icons/faExclamation';
import JepWagerInput from './JepWagerInput.vue';
import JepDashboardActions from './JepDashboardActions.vue';
import JepReadOnlyDashboardActions from './JepReadOnlyDashboardActions.vue';
import JepDashboardClueDisplay from './JepDashboardClueDisplay.vue';
import { DateTime } from 'luxon';
import { faXmark } from '@fortawesome/free-solid-svg-icons/faXmark';
import { faAddressCard } from '@fortawesome/free-solid-svg-icons/faAddressCard';
import { faRotateLeft } from '@fortawesome/free-solid-svg-icons/faRotateLeft';

library.add(faUserEdit, faExclamation, faXmark, faAddressCard, faRotateLeft);

const jepStore = useJepStore();

const contestantManagementDialog = useTemplateRef('contestantManagementDialog');
const finalJeopardyResults = ref<{ maxWager: number | null, wager: number, submitted: boolean }[]>([]);

const params = new URLSearchParams(window.location.search);
const isReadOnly = params.has('ro') && params.get('ro') !== 'false';
const showDirectorControls = params.has('director') && params.get('director') !== 'false';

const parsedUpdateTime = computed(() => DateTime.fromISO(jepStore.jepState.lastUpdated));
const timeSinceLastUpdate = ref('00:00');
let showTimerUpdateInterval: number | undefined = undefined;

const canUndo = computed(() =>
    jepStore.jepState.state === 'DAILY_DOUBLE_AWAITING_WAGER' ||
    jepStore.jepState.state === 'PREPARING_CLUE');

async function undoLastAction() {
    await sendMessage('jep:undoLastAction');
}

onMounted(() => {
    showTimerUpdateInterval = window.setInterval(() => {
        timeSinceLastUpdate.value = DateTime.now().diff(parsedUpdateTime.value, ['second', 'minute']).toFormat('mm:ss');
    }, 100);
});

onUnmounted(() => {
    window.clearInterval(showTimerUpdateInterval);
});

const revealedCategories = computed(() => {
    if (jepStore.jepState.state === 'REVEALING_CATEGORIES') {
        // @ts-expect-error
        return jepStore.jepBoard.categories.map((cat, i) => jepStore.jepState.lastRevealedCategoryIndex >= i ? cat.name : null);
    } else {
        return jepStore.jepBoard.categories.map((cat) => cat.name);
    }
});

watch(() => jepStore.jepState, (newValue, oldValue) => {
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
    if (!isReadOnly && jepStore.jepState.state === 'PICKING_CLUE') {
        await sendMessage('jep:pickClue', position);
    }
}

async function mostlyCompleteTestBoard() {
    await sendMessage('jep:mostlyCompleteTestBoard');
}

async function finalJepRevealAnswer(contestantIndex: number, amountWagered: number, isCorrect: boolean) {
    await sendMessage('finalJep:revealAnswer', { contestantIndex, amountWagered, isCorrect });
    finalJeopardyResults.value[contestantIndex].submitted = true;
}
</script>

<style lang="scss">
body {
    margin: 0 !important;
    overflow-y: hidden;
}
</style>

<style scoped lang="scss">
@use '../../styles/dashboard-colors';

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

.board-display {
    display: grid;
    grid-template-rows: repeat(var(--row-count), auto);
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, 1fr);
    gap: 8px;
    position: relative;

    > *:not(.selected-clue-overlay) {
        text-align: center !important;
        font-size: 1.5em !important;
        font-weight: 700;

        &.category-name {
            font-size: 1em !important;
            overflow-wrap: anywhere;
            position: relative;
            min-height: 3em;

            &.smaller {
                font-size: 0.75em !important;
            }
        }

        &.answered {
            opacity: 0.25;
        }
    }
}

.selected-clue-overlay {
    position: absolute;
    width: 100%;
    height: 100%;
    z-index: 2;
}

.final-jeopardy-answer-section {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, 1fr);
    gap: 8px;
}

.final-jeopardy-display {
    min-height: 12em;
}

.show-timer {
    font-variant-numeric: tabular-nums;
    text-align: center;
    font-size: 1.15em;
    min-width: 5em;
    margin: 16px auto 0;
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

        &.color-blue > .contestant-score.is-negative {
            color: #ffa495;
        }

        > .contestant-score {
            font-weight: 700;

            &.is-negative {
                color: dashboard-colors.$state-red;
            }
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
