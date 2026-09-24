<template>
    <ipl-space class="clue-display">
        <div class="category">
            {{ props.title }}
        </div>
        <div
            class="prompt"
            :class="{ smaller: ensmallenPrompt, 'has-image': props.image != null }"
        >
            <div
                class="hidden-from-contestants-indicator"
                :style="{ opacity: props.hiddenFromContestants ? '1' : '0' }"
            >
                Secret!
            </div>
            <div
                v-if="props.image != null"
                class="prompt-image"
                :style="{ backgroundImage: `url('${props.image}')` }"
            />
            <template v-else>
                {{ props.prompt }}
            </template>
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
    image?: string | null
    hiddenFromContestants?: boolean
}>();

const ensmallenPrompt = computed(() => props.prompt.length >= 96);
</script>

<style scoped lang="scss">
@use '../../styles/dashboard-colors';

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

    &.has-image {
        width: 100%;
        flex-grow: 1;
        margin: 8px 0;
        display: flex;
        flex-direction: column;
        align-items: center;

        > .hidden-from-contestants-indicator {
            position: unset;
            transform: unset;
            display: inline;
            margin-bottom: 4px;
        }
    }
}

.prompt-image {
    width: 100%;
    flex-grow: 1;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
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

.hidden-from-contestants-indicator {
    font-weight: 400;
    font-size: 0.6em;
    background-color: dashboard-colors.$state-red;
    position: absolute;
    left: 50%;
    transform: translate(-50%, -100%);
    padding: 2px 4px 3px;
    border-radius: 8px;
}
</style>
