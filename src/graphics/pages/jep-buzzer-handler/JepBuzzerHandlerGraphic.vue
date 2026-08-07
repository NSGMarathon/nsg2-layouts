<template>
    <div>
        HI HELLO<br>
        Press <kbd>{{ buzzerTimeoutKey }}</kbd> to indicate buzzer timeout<br>
        Press <kbd>{{ buzzerStartKey }}</kbd> to indicate that the buzzer is engaged<br>
        Press <kbd>{{ correctAnswerKey }}</kbd> to indicate a clue was answered correctly<br>
        Press <kbd>{{ incorrectAnswerKey }}</kbd> to indicate a clue was answered incorrectly<br>
        These keys correspond to each contestant's buzzer:
        <ul>
            <li v-for="(key, i) in buzzerKeys"><kbd>{{ key }}</kbd> for contestant {{ i + 1 }}</li>
        </ul>
    </div>
</template>

<script setup lang="ts">
import { JEP_CONTESTANT_COUNT } from 'shared/JepConstants';
import { onMounted, onUnmounted } from 'vue';
import { sendMessage } from 'client-shared/helpers/NodecgHelper';

// todo: this thing needs to play out sound effects

const params = new URLSearchParams(window.location.search);

function buildBuzzerKeys() {
    const result = [];
    for (let i = 1; i <= JEP_CONTESTANT_COUNT; i++) {
        result.push(params.get(`buzz-${i}`)?.toLowerCase() ?? String(i));
    }
    return result;
}

const buzzerKeys = buildBuzzerKeys();
const buzzerTimeoutKey = params.get('timeout-key')?.toLowerCase() ?? 't';
const buzzerStartKey = params.get('start-key')?.toLowerCase() ?? 's';
const correctAnswerKey = params.get('correct-key')?.toLowerCase() ?? 'o';
const incorrectAnswerKey = params.get('incorrect-key')?.toLowerCase() ?? 'x';

function onKeydown(event: KeyboardEvent) {
    if (event.key === buzzerTimeoutKey) {
        sendMessage('jep:buzzerEvent', { buzzedByIndex: null }).catch(logMessageError);
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
