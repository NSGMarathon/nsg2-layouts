<template>
    <div>
        <ipl-label>Video file</ipl-label>
        <div class="layout horizontal center-vertical">
            <ipl-space
                class="video-file-select"
                clickable
                :color="props.color"
                @click="onClick"
            >
                <span>{{ props.modelValue?.name ?? 'N/A' }}</span>
            </ipl-space>
            <ipl-button
                v-if="props.modelValue != null"
                icon="xmark"
                color="red"
                inline
                @click="emit('update:modelValue', undefined)"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { IplButton, IplLabel, IplSpace } from '@iplsplatoon/vue-components';
import { VideoFile } from 'types/schemas';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faXmark } from '@fortawesome/free-solid-svg-icons/faXmark';
import { inject } from 'vue';
import { VideoFileSelectDialogInjectionKey } from '../helpers/Injections';

library.add(faXmark);

const props = defineProps<{
    modelValue: VideoFile | null | undefined
    color: 'secondary' | 'primary'
}>();

const emit = defineEmits<{
    'update:modelValue': [newValue: VideoFile | null | undefined]
}>();

const videoFileSelectDialog = inject(VideoFileSelectDialogInjectionKey);
function onClick() {
    videoFileSelectDialog?.value?.open(newValue => {
        emit('update:modelValue', newValue);
    });
}
</script>

<style scoped lang="scss">
.video-file-select {
    padding: 4px !important;
    text-align: center !important;
    box-sizing: border-box;

    span {
        font-weight: 600;
    }
}

.ipl-button {
    font-size: 0.6em !important;
    margin-left: 4px;
}
</style>
