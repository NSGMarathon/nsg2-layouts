<template>
    <ipl-dialog
        v-model:is-open="isOpen"
        style="width: 600px"
    >
        <template #header>
            <ipl-dialog-title
                title="Select video"
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
            <div class="layout horizontal center-horizontal">
                <ipl-radio
                    v-model="returnToScene"
                    label="After video, return to..."
                    :options="returnToSceneOptions"
                    name="returnToScene"
                />
            </div>
        </template>
        <div
            class="video-file-list"
            :class="{ loading: isLoading }"
        >
            <ipl-space
                v-for="(file, i) in videoFileStore.videoFiles.interstitials"
                :key="i"
                clickable
                color="secondary"
                @click="onSelect(file)"
            >
                {{ file.name }}
            </ipl-space>
        </div>
    </ipl-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { IplButton, IplDialog, IplDialogTitle, IplRadio, IplSpace } from '@iplsplatoon/vue-components';
import { useVideoFileStore } from 'client-shared/stores/VideoFileStore';
import { VideoFile } from 'types/schemas';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faRotate } from '@fortawesome/free-solid-svg-icons/faRotate';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { sendMessage } from 'client-shared/helpers/NodecgHelper';
import { useObsStore } from 'client-shared/stores/ObsStore';
import { InterstitialVideoState } from 'types/schemas/interstitialVideoState';

library.add(faRotate);

const videoFileStore = useVideoFileStore();
const obsStore = useObsStore();

const returnToScene = ref<InterstitialVideoState['returnToScene']>('INTERMISSION');
const returnToSceneOptions = computed(() => [
    { name: 'Intermission', value: 'INTERMISSION' },
    { name: 'Preview Scene', value: 'PREVIEW', enabled: obsStore.obsState.previewScene != null }
]);

const isOpen = ref(false);
const isLoading = ref(false);
watch(isOpen, newValue => {
    if (!newValue) {
        returnToScene.value = 'INTERMISSION';
        isLoading.value = false;
    }
});

function open() {
    isOpen.value = true;
}

async function onSelect(file: VideoFile) {
    if (isLoading.value) return;

    isLoading.value = true;
    try {
        await sendMessage('videos:playInterstitial', { file, returnToScene: returnToScene.value });
        isOpen.value = false;
    } finally {
        isLoading.value = false;
    }
}

async function onRefresh() {
    await sendMessage('videos:loadInterstitials');
}

defineExpose({
    open
});
</script>

<style scoped lang="scss">
.video-file-list {
    > * {
        transition: opacity 250ms;

        &:not(:last-child) {
            margin-bottom: 8px;
        }
    }

    &.loading > * {
        opacity: 0.75;
    }
}
</style>
