<template>
    <div class="layout horizontal center-vertical center-horizontal">
        <div class="layout vertical center-horizontal">
            <ipl-input
                v-model="model"
                :name="props.name"
                label="Make a wager"
                type="number"
                extra="points"
                ref="input"
                class="wager-input"
                :disabled="props.disabled"
            />
            <div class="m-t-8">Max. {{ props.max }}</div>
            <ipl-button
                label="MAX"
                class="m-t-8"
                style="width: 5em"
                :disabled="props.disabled"
                @click="model = props.max"
            />
        </div>
        <div class="m-l-8 touchscreen-add-subtract-section">
            <ipl-button
                v-for="preset in presetAmounts"
                :label="`${preset > 0 ? '+' : ''}${preset}`"
                :color="preset > 0 ? 'green' : 'red'"
                :disabled="props.disabled"
                @click="addToValue(preset)"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { IplButton, IplInput } from '@iplsplatoon/vue-components';
import { useTemplateRef } from 'vue';

const model = defineModel<number>();

const props = defineProps<{
    disabled?: boolean
    max: number
    name: string
}>();

const presetAmounts = [-10, -100, -1000, 10, 100, 1000];

const input = useTemplateRef('input');

function focus() {
    input.value?.focus();
}

function addToValue(amount: number) {
    model.value = Math.max(Math.min((model.value ?? 0) + amount, props.max), 0)
}

defineExpose({
    focus
});
</script>

<style scoped lang="scss">
.touchscreen-add-subtract-section {
    display: grid;
    grid-auto-flow: column;
    grid-template-rows: repeat(3, minmax(0, 1fr));
    gap: 8px;

    > * {
        padding: 0.3em 0.1em !important;
        font-size: 0.9em !important;
    }
}

.wager-input {
    max-width: 10em;
}
</style>
