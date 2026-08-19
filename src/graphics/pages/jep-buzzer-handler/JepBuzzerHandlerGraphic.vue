<template>
    <div>
        HI HELLO<br>
        Press <kbd>{{ buzzerTimeoutKey }}</kbd> to indicate buzzer timeout (change with the query parameter <code>{{ paramKeyBuzzerTimeout }}</code>)<br>
        Press <kbd>{{ buzzerStartKey }}</kbd> to indicate that the buzzer is engaged (query param <code>{{ paramKeyBuzzerStart }}</code>)<br>
        Press <kbd>{{ correctAnswerKey }}</kbd> to indicate a clue was answered correctly (query param <code>{{ paramKeyCorrectAnswer }}</code>)<br>
        Press <kbd>{{ incorrectAnswerKey }}</kbd> to indicate a clue was answered incorrectly (query param <code>{{ paramKeyIncorrectAnswer }}</code>)<br>
        These keys correspond to each contestant's buzzer:
        <ul>
            <li v-for="(key, i) in buzzerKeys"><kbd>{{ key }}</kbd> for contestant {{ i + 1 }} (query param <code>{{ buzzerKeyPrefix }}{{ i + 1 }}</code>)</li>
        </ul>
    </div>
</template>

<script setup lang="ts">
import { JEP_CONTESTANT_COUNT } from 'shared/JepConstants';
import { onMounted, onUnmounted, watch } from 'vue';
import { sendMessage } from 'client-shared/helpers/NodecgHelper';
import { useJepStore } from 'client-shared/stores/JepStore';

// todo: this thing needs to play out sound effects

const params = new URLSearchParams(window.location.search);

const buzzerKeyPrefix = 'buzz-';
function buildBuzzerKeys() {
    const result = [];
    for (let i = 1; i <= JEP_CONTESTANT_COUNT; i++) {
        result.push(params.get(`${buzzerKeyPrefix}${i}`)?.toLowerCase() ?? String(i));
    }
    return result;
}

const buzzerKeys = buildBuzzerKeys();
const paramKeyBuzzerTimeout = 'timeout-key';
const paramKeyBuzzerStart = 'start-key';
const paramKeyCorrectAnswer = 'correct-key';
const paramKeyIncorrectAnswer = 'incorrect-key';
const buzzerTimeoutKey = params.get(paramKeyBuzzerTimeout)?.toLowerCase() ?? 't';
const buzzerStartKey = params.get(paramKeyBuzzerStart)?.toLowerCase() ?? 's';
const correctAnswerKey = params.get(paramKeyCorrectAnswer)?.toLowerCase() ?? 'o';
const incorrectAnswerKey = params.get(paramKeyIncorrectAnswer)?.toLowerCase() ?? 'x';

const jepStore = useJepStore();

watch(() => jepStore.jepState.state, (newValue, oldValue) => {
    if (jepStore.jepBoard.round === 'JEOPARDY' && newValue === 'REVEALING_CATEGORIES' && oldValue === 'STARTING_NEXT_ROUND') {
        nodecg.playSound('jep-board-reveal');
    } else if (oldValue !== 'DAILY_DOUBLE_AWAITING_WAGER' && newValue === 'DAILY_DOUBLE_AWAITING_WAGER') {
        nodecg.playSound('jep-daily-double');
    } else if (newValue === 'FINAL_JEP_AWAITING_WAGERS') {
        nodecg.playSound('jep-final-category-reveal');
    }
});

function onKeydown(event: KeyboardEvent) {
    if (event.key === buzzerTimeoutKey) {
        sendMessage('jep:buzzerEvent', { buzzedByIndex: null })
            .then(() => {
                nodecg.playSound('jep-timeout');
            })
            .catch(logMessageError);
    } else if (event.key === buzzerStartKey) {
        sendMessage('jep:enableBuzzer').catch(logMessageError);
    } else if (event.key === correctAnswerKey) {
        sendMessage('jep:answerClue', { isCorrect: true }).catch(logMessageError);
    } else if (event.key === incorrectAnswerKey) {
        sendMessage('jep:answerClue', { isCorrect: false }).catch(logMessageError);
    } else {
        const contestantIndex = buzzerKeys.findIndex((key) => key === event.key);
        if (contestantIndex !== -1) {
            sendMessage('jep:buzzerEvent', { buzzedByIndex: contestantIndex }).catch(logMessageError);
        }
    }
}

function logMessageError(e: unknown) {
    if (typeof e === 'object' && e != null && 'message' in e) {
        console.error(e.message);
    } else {
        console.error(e);
    }
}

onMounted(() => {
    window.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
    window.removeEventListener('keydown', onKeydown);
});
</script>
