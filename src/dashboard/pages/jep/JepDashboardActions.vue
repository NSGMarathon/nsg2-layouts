<template>
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
            <div
                v-if="jepStore.jepState.state === 'DAILY_DOUBLE_AWAITING_ANSWER'"
                class="layout vertical center-horizontal m-b-8"
            >
                <ipl-button
                    v-if="props.isDirector"
                    :disabled="jepStore.jepOverlays.clueBoxVisible"
                    class="m-b-8"
                    @click="jepStore.revealClueBox"
                >
                    Show clue overlay
                </ipl-button>
                Received a {{ jepStore.jepState.pointsWaged }} point wager
            </div>
            <div><jep-contestant-indicator :contestant-index="jepStore.jepState.state === 'AWAITING_ANSWER' ? jepStore.jepState.buzzedByIndex : jepStore.jepState.lastCluePickedByIndex" /> to answer</div>
        </template>
        <template v-else-if="jepStore.jepState.state === 'READING_CORRECT_ANSWER'">
            <div class="m-b-8">Reading out the correct answer...</div>
            <div><jep-contestant-indicator :contestant-index="jepStore.jepState.lastCluePickedByIndex" /> picks the next clue</div>
            <ipl-button
                class="m-t-8"
                @click="finishReadingAnswer"
            >
                Continue
            </ipl-button>
        </template>
        <form
            v-else-if="jepStore.jepState.state === 'DAILY_DOUBLE_AWAITING_WAGER'"
            class="layout horizontal"
            @submit.prevent
        >
            <jep-wager-input
                v-model="dailyDoubleWager"
                :max="jepStore.maxDailyDoubleWager ?? 0"
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
        </form>
        <template v-else-if="jepStore.jepState.state === 'FINAL_JEP_AWAITING_WAGERS'">
            Waiting for wagers...
            <ipl-button
                class="m-t-8"
                @click="finalJepFinishWagering"
            >
                Continue
            </ipl-button>
        </template>
        <template v-else-if="jepStore.jepState.state === 'FINAL_JEP_READING_CLUE'">
            Reading out the clue...
            <ipl-button
                class="m-t-8"
                @click="finalJepFinishReadingClue"
            >
                Finish reading
            </ipl-button>
        </template>
        <template v-else-if="jepStore.jepState.state === 'FINAL_JEP_AWAITING_ANSWERS' || jepStore.jepState.state === 'FINAL_JEP_REVEALING_ANSWERS'">
            <div class="final-jeopardy-prompt m-b-16">{{ jepStore.finalJeopardyClue?.prompt }}</div>
            <div class="final-jeopardy-answer-label">Answer:</div>
            <div class="final-jeopardy-answer">
                {{ jepStore.finalJeopardyClue?.answer }}
            </div>
        </template>
        <template v-else-if="jepStore.jepState.state === 'VIEW_FINAL_RESULT'">
            It's over!
        </template>
    </ipl-space>
</template>

<script setup lang="ts">
import { IplButton, IplSpace } from '@iplsplatoon/vue-components';
import JepWagerInput from './JepWagerInput.vue';
import JepContestantIndicator from './JepContestantIndicator.vue';
import { useJepStore } from 'client-shared/stores/JepStore';
import { sendMessage } from 'client-shared/helpers/NodecgHelper';
import { JEP_CLUES_PER_CATEGORY, JEP_DAILY_DOUBLE_MIN_WAGER } from 'shared/JepConstants';
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck';

const props = defineProps<{
    isDirector?: boolean
}>();

library.add(faCheck);

const jepStore = useJepStore();

const dailyDoubleWagerInput = useTemplateRef('dailyDoubleWagerInput');
const dailyDoubleWager = ref(0);
const dailyDoubleWagerValid = computed(() => dailyDoubleWager.value >= JEP_DAILY_DOUBLE_MIN_WAGER && dailyDoubleWager.value <= (jepStore.maxDailyDoubleWager ?? 0));

watch(() => jepStore.jepState, (newValue) => {
    if (newValue.state === 'DAILY_DOUBLE_AWAITING_WAGER') {
        dailyDoubleWager.value = 0;
        nextTick(() => {
            dailyDoubleWagerInput.value?.focus();
        });
    }
});

async function revealCategory() {
    await sendMessage('jep:revealCategory');
}

async function finishReadingAnswer() {
    await sendMessage('jep:finishReadingAnswer');
}

async function makeDailyDoubleWager() {
    await sendMessage('jep:makeDailyDoubleWager', { amount: dailyDoubleWager.value });
    dailyDoubleWager.value = 0;
}

async function finalJepFinishWagering() {
    await sendMessage('finalJep:finishWagering');
}

async function finalJepFinishReadingClue() {
    await sendMessage('finalJep:finishReadingClue');
}
</script>

<style scoped lang="scss">
.board-actions {
    min-height: 11rem;
    text-align: center;
    overflow-wrap: anywhere;

    .ipl-button {
        width: 10em;
    }
}

.final-jeopardy-prompt {
    font-weight: 700;
}

.final-jeopardy-answer-label {
    color: var(--ipl-input-color);
    font-size: 0.75em;
}
</style>
