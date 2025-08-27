<template>
    <div>
        <ipl-label>Country code</ipl-label>
        <div class="layout horizontal center-vertical">
            <ipl-space
                class="country-code-select"
                clickable
                :color="props.color"
                @click="onClick"
            >
                <img
                    v-if="flagExists"
                    :src="`/bundles/${bundleName}/flags/svg/${props.modelValue}.svg`"
                    :alt="props.modelValue!"
                >
                <span>{{ props.modelValue ?? 'N/A' }}</span>
            </ipl-space>
            <ipl-button
                v-if="props.modelValue != null"
                icon="xmark"
                color="red"
                inline
                @click="emit('update:modelValue', null)"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { IplButton, IplLabel, IplSpace } from '@iplsplatoon/vue-components';
import regions from '../../../flags/regions.json';
import { computed, inject } from 'vue';
import { CountrySelectDialogInjectionKey } from '../helpers/Injections';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faXmark } from '@fortawesome/free-solid-svg-icons/faXmark';

library.add(faXmark);

const props = defineProps<{
    modelValue: string | null | undefined
    color: 'secondary' | 'primary'
}>();

const emit = defineEmits<{
    'update:modelValue': [newValue: string | null | undefined]
}>();

const flagExists = computed(() => props.modelValue != null && Object.keys(regions).includes(props.modelValue));
const bundleName = nodecg.bundleName;

const countrySelectDialog = inject(CountrySelectDialogInjectionKey);
function onClick(event: Event) {
    countrySelectDialog?.value?.open(newValue => emit('update:modelValue', newValue), event.target as HTMLElement);
}
</script>

<style scoped lang="scss">
.country-code-select {
    padding: 4px !important;
    text-align: center !important;
    box-sizing: border-box;

    img {
        height: 12px;
        display: inline-block;
        border: 1px solid var(--ipl-input-color);
        margin-top: 1px;
    }

    span {
        margin-left: 6px;
        font-weight: 600;
    }
}

.ipl-button {
    font-size: 0.6em;
    margin-left: 4px;
}
</style>
