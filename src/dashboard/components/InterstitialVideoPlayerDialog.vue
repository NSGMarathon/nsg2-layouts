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
                <ipl-select
                    v-model="returnToScene"
                    label="After video, return to..."
                    :options="returnToSceneOptions"
                    name="returnToScene"
                    style="width: 18em"
                />
                <div class="m-l-16">
                    <ipl-radio
                        v-model="order"
                        label="Order by..."
                        :options="orderOptions"
                        name="order"
                    />
                </div>
            </div>
        </template>
        <div
            class="video-file-list"
            :class="{ loading: isLoading }"
        >
            <ipl-space
                v-for="file in videoFiles"
                :key="file.path"
                clickable
                color="secondary"
                @click="onSelect(file)"
            >
                <b>{{ file.name }}</b><br>
                <small v-if="file.parsedLastPlayed == null">
                    Never played before
                </small>
                <small
                    v-else
                    :title="file.parsedLastPlayed.toLocaleString(DateTime.DATETIME_MED_WITH_WEEKDAY)"
                >
                    Last played {{ file.parsedLastPlayed.toRelative() }}
                </small>
            </ipl-space>
        </div>
    </ipl-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { IplButton, IplDialog, IplDialogTitle, IplRadio, IplSelect, IplSpace } from '@iplsplatoon/vue-components';
import { useVideoFileStore } from 'client-shared/stores/VideoFileStore';
import { VideoFile } from 'types/schemas';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faRotate } from '@fortawesome/free-solid-svg-icons/faRotate';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { sendMessage } from 'client-shared/helpers/NodecgHelper';
import { useObsStore } from 'client-shared/stores/ObsStore';
import { DateTime } from 'luxon';

library.add(faRotate);

const videoFileStore = useVideoFileStore();
const obsStore = useObsStore();

function getDefaultReturnToScene() {
    return obsStore.obsConfig.intermissionScene ?? obsStore.obsState.scenes?.[0] ?? '';
}

const returnToScene = ref<string>(getDefaultReturnToScene());
const returnToSceneOptions = computed(() => (obsStore.obsState.scenes ?? [])
    .filter((scene) =>
        // "utility scenes" that should never be switched to
        scene !== obsStore.obsConfig.videoInputsScene
        && scene !== obsStore.obsConfig.interstitialVideoScene
        && !obsStore.obsConfig.gameLayoutVideoFeedScenes.includes(scene)
    )
    .toSorted((a, b) => {
        // there _has_ to be a better way of doing this, right?
        if (a === obsStore.obsConfig.intermissionScene) {
            return -1;
        } else if (b === obsStore.obsConfig.intermissionScene) {
            return 1;
        }

        if (a === obsStore.obsState.currentScene) {
            return -1;
        } else if (b === obsStore.obsState.currentScene) {
            return 1;
        }

        if (a === obsStore.obsState.previewScene){
            return -1;
        } else if (b === obsStore.obsState.previewScene) {
            return 1;
        }

        return a.localeCompare(b);
    })
    .map((scene) => {
        if (scene === obsStore.obsConfig.intermissionScene) {
            return { name: 'Intermission scene', value: scene };
        } else if (scene === obsStore.obsState.currentScene) {
            return { name: `${scene} (Currently in program)`, value: scene };
        } else if (scene === obsStore.obsState.previewScene) {
            return { name: `${scene} (Currently in preview)`, value: scene };
        } else {
            return { name: scene, value: scene };
        }
    }));

const order = ref<'TIME_PLAYED' | 'NAME'>('TIME_PLAYED');
const orderOptions = [
    { name: 'Time played', value: 'TIME_PLAYED' },
    { name: 'Name', value: 'NAME' }
];

const videoFiles = computed(() => videoFileStore.videoFiles.interstitials
    .toSorted((a, b) => {
        if (order.value === 'NAME' || (a.lastPlayed == null && b.lastPlayed == null)) {
            return a.name.localeCompare(b.name);
        } else {
            if (a.lastPlayed == null) {
                return -1;
            } else if (b.lastPlayed == null) {
                return 1;
            } else {
                return DateTime.fromISO(a.lastPlayed) > DateTime.fromISO(b.lastPlayed) ? 1 : -1;
            }
        }
    })
    .map(video => ({
        ...video,
        parsedLastPlayed: video.lastPlayed == null ? null : DateTime.fromISO(video.lastPlayed)
    })));

const isOpen = ref(false);
const isLoading = ref(false);
watch(isOpen, newValue => {
    if (!newValue) {
        returnToScene.value = getDefaultReturnToScene();
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
