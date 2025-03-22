<template>
    <ipl-dialog
        v-model:is-open="isOpen"
        style="width: 600px"
    >
        <ipl-dialog-title
            title="Select video"
            class="m-b-8"
            color="secondary"
            @close="isOpen = false"
        >
            <template #end>
                <ipl-button
                    small
                    async
                    @click="onRefresh"
                >
                    <font-awesome-icon icon="rotate" />
                    Refresh
                </ipl-button>
            </template>
        </ipl-dialog-title>
        <ipl-space
            color="secondary"
            class="video-file-list"
        >
            <ipl-space
                v-for="(file, i) in videoFileStore.videoFiles.speedruns"
                :key="i"
                clickable
                @click="onSelect(file)"
            >
                {{ file.name }}
            </ipl-space>
        </ipl-space>
    </ipl-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { IplButton, IplDialog, IplDialogTitle, IplSpace } from '@iplsplatoon/vue-components';
import { useVideoFileStore } from 'client-shared/stores/VideoFileStore';
import { VideoFile } from 'types/schemas';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faRotate } from '@fortawesome/free-solid-svg-icons/faRotate';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { sendMessage } from 'client-shared/helpers/NodecgHelper';

library.add(faRotate);

type SelectCallback = (file: VideoFile) => void;
let selectCallback: SelectCallback | null = null;

const videoFileStore = useVideoFileStore();

const isOpen = ref(false);
watch(isOpen, newValue => {
    if (!newValue) {
        selectCallback = null;
    }
});

function open(onSelect: SelectCallback) {
    selectCallback = onSelect;
    isOpen.value = true;
}

function onSelect(file: VideoFile) {
    if (selectCallback != null) {
        selectCallback(file);
    }
    isOpen.value = false;
}

async function onRefresh() {
    await sendMessage('videos:loadSpeedruns');
}

defineExpose({
    open
});
</script>

<style scoped lang="scss">
.video-file-list {
    height: 75vh;
    overflow-y: auto;

    > *:not(:last-child) {
        margin-bottom: 8px;
    }
}
</style>
