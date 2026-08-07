<template>
    <ipl-space class="clue-display">
        <div class="category">
            {{ props.title }}
        </div>
        <div
            class="prompt"
            :class="{ smaller: ensmallenPrompt }"
        >
            {{ props.prompt }}
        </div>
        <div class="answer">
            <div
                v-show="answer != null"
                class="answer-label"
            >
                Answer:
            </div>
            {{ props.answer }}
        </div>
    </ipl-space>
</template>

<script setup lang="ts">
import { IplSpace } from '@iplsplatoon/vue-components';
import { computed } from 'vue';

const props = defineProps<{
    title: string
    prompt: string
    answer?: string
}>();

const ensmallenPrompt = computed(() => props.prompt.length >= 96);
</script>

<style scoped lang="scss">
.clue-display {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    text-align: center;
}

.category {
    font-size: 1em;
    font-weight: 400;
    width: auto;
    text-align: center;
    padding: 0 8px;
    border-bottom: 1px solid var(--ipl-input-color);
}

.prompt {
    font-size: 2em;
    overflow-wrap: anywhere;
    font-weight: 700;

    &.smaller {
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
    font-size: 1.25em;
}
</style>
