<template>
    <div>
        <ipl-small-toggle
            v-if="showStreamTechOptions"
            v-model="showPlacementHelpers"
            label="Show element placement guides"
        />
        <ipl-radio
            v-model="color"
            :options="colorOptions"
            name="color"
            label="Color"
            class="m-b-8"
        />
        <ipl-input
            v-model="text"
            label="Text"
            name="text"
        />
        <div
            v-if="!stageDisplayStore.stageDisplayState.message.visible"
            class="m-t-8 layout horizontal"
        >
            <ipl-button
                @click="stageDisplayStore.showMessage(color, text, 'GENTLE')"
            >
                Show Gently
            </ipl-button>
            <ipl-button
                color="yellow"
                class="m-l-8"
                @click="stageDisplayStore.showMessage(color, text, 'QUICK')"
            >
                Show Quickly
            </ipl-button>
        </div>
        <div
            v-else
            class="m-t-8 layout horizontal"
        >
            <ipl-button
                color="red"
                @click="stageDisplayStore.hideMessage()"
            >
                Dismiss Message
            </ipl-button>
            <ipl-button
                class="m-l-8"
                @click="stageDisplayStore.showMessage(color, text)"
            >
                Update Message
            </ipl-button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useStageDisplayStore } from 'client-shared/stores/StageDisplayStore';
import { IplButton, IplInput, IplRadio, IplSmallToggle } from '@iplsplatoon/vue-components';
import { computed, ref, watch } from 'vue';
import { SelectOptions } from '@iplsplatoon/vue-components/dist/types/select';
import { StageDisplayState } from 'types/schemas/stageDisplayState';

withDefaults(defineProps<{
    showStreamTechOptions: boolean
}>(), {
    showStreamTechOptions: false
});

const stageDisplayStore = useStageDisplayStore();

const showPlacementHelpers = computed({
    get() {
        return stageDisplayStore.stageDisplayState.showPlacementHelpers
    },
    set(newValue: boolean) {
        stageDisplayStore.setShowPlacementHelpers(newValue);
    }
});

const modeOptions: SelectOptions = [
    { name: 'Quick', value: 'QUICK' },
    { name: 'Gentle', value: 'GENTLE' }
];
const colorOptions: SelectOptions = [
    { name: 'Yellow', value: 'YELLOW' },
    { name: 'Red', value: 'RED' },
    { name: 'Gray', value: 'GRAY' }
];

const mode = ref<StageDisplayState['message']['mode']>('GENTLE');
const color = ref<StageDisplayState['message']['color']>('GRAY');
const text = ref<string>('');

watch(() => stageDisplayStore.stageDisplayState.message, newValue => {
    mode.value = newValue.mode;
    color.value = newValue.color;
    text.value = newValue.text;
}, { immediate: true });
</script>

<style scoped lang="scss">

</style>
