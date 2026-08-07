<template>
    <ipl-space class="board-actions m-t-16 layout vertical center-horizontal center-vertical">
        <template v-if="jepStore.jepState.state === 'REVEALING_CATEGORIES'">
            <template v-if="jepStore.jepBoard.round === 'FINAL_JEOPARDY'">
                Revealing the category...
            </template>
            <template v-else-if="nextCategoryToReveal != null">
                <div class="next-category-label">The next category is...</div>
                <div class="next-category">{{ nextCategoryToReveal }}</div>
            </template>
            <template v-else>
                Waiting...
            </template>
        </template>
        <div v-else-if="jepStore.jepState.state === 'PICKING_CLUE'">
            <jep-contestant-indicator :contestant-index="jepStore.jepState.pickingContestantIndex" /> picks a clue
        </div>
        <div v-else-if="jepStore.jepState.state === 'PREPARING_CLUE'">
            {{ jepStore.jepState.buzzerEnabled ? 'Waiting for a player to buzz in...' : 'Waiting for the buzzers to be armed...' }}
        </div>
        <template v-else-if="jepStore.jepState.state === 'AWAITING_ANSWER' || jepStore.jepState.state === 'DAILY_DOUBLE_AWAITING_ANSWER'">
            <div
                v-if="jepStore.jepState.state === 'DAILY_DOUBLE_AWAITING_ANSWER'"
                class="m-b-8"
            >
                Received a {{ jepStore.jepState.pointsWaged }} point wager
            </div>
            <div><jep-contestant-indicator :contestant-index="jepStore.jepState.state === 'AWAITING_ANSWER' ? jepStore.jepState.buzzedByIndex : jepStore.jepState.lastCluePickedByIndex" /> to answer</div>
        </template>
        <template v-else-if="jepStore.jepState.state === 'READING_CORRECT_ANSWER'">
            <div class="m-b-8">Reading out the correct answer...</div>
            <div><jep-contestant-indicator :contestant-index="jepStore.jepState.lastCluePickedByIndex" /> picks the next clue</div>
        </template>
        <div v-else-if="jepStore.jepState.state === 'DAILY_DOUBLE_AWAITING_WAGER'">
            <div class="m-b-8">Daily Double!</div>
            The maximum wager is {{ jepStore.maxDailyDoubleWager ?? 0 }}
        </div>
        <template v-else-if="jepStore.jepState.state === 'FINAL_JEP_AWAITING_WAGERS'">
            Waiting for wagers...
        </template>
        <template v-else-if="jepStore.jepState.state === 'FINAL_JEP_READING_CLUE'">
            Reading out the clue...
        </template>
        <template v-else-if="jepStore.jepState.state === 'FINAL_JEP_AWAITING_ANSWERS' || jepStore.jepState.state === 'FINAL_JEP_REVEALING_ANSWERS'">
            Waiting for answers...
        </template>
        <template v-else-if="jepStore.jepState.state === 'VIEW_FINAL_RESULT'">
            It's over!
        </template>
    </ipl-space>
</template>

<script setup lang="ts">
import { useJepStore } from 'client-shared/stores/JepStore';
import JepContestantIndicator from './JepContestantIndicator.vue';
import { IplSpace } from '@iplsplatoon/vue-components';
import { computed } from 'vue';

const jepStore = useJepStore();

const nextCategoryToReveal = computed(() => jepStore.jepState.state === 'REVEALING_CATEGORIES' ? jepStore.jepBoard.categories[jepStore.jepState.lastRevealedCategoryIndex + 1]?.name : null);
</script>

<style scoped lang="scss">
.board-actions {
    font-size: 1.25em;
    min-height: 6rem;
    text-align: center;
    overflow-wrap: anywhere;
}

.next-category-label {
    font-size: 0.75em;
}

.next-category {
    font-weight: 700;
    font-size: 1.25em;
    overflow-wrap: anywhere;
}
</style>
