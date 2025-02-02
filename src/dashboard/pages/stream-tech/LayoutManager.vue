<template>
    <div
        class="layout-manager"
        ref="wrapper"
    >
        <div style="position: relative; max-height: 100%; opacity: 1">
            <transition name="capture-select-reveal">
                <ipl-space
                    v-if="selectedCapture != null"
                    class="capture-select"
                >
                    <div class="title">Video input for {{ selectedCapture.type }} capture #{{ selectedCapture.index + 1 }}</div>
                    <ipl-button
                        class="m-t-8"
                        :disabled="!allowCropping"
                        @click="sourceCroppingDialog?.open(obsStore.obsVideoInputAssignments[selectedFeedIndex][selectedCapture.type === 'game' ? 'gameCaptures' : 'cameraCaptures'][selectedCapture.index]!, selectedCapture!)"
                    >
                        <font-awesome-icon icon="crop" />
                        Adjust crop
                    </ipl-button>
                    <ipl-space
                        v-for="input in obsStore.obsState.videoInputs ?? []"
                        :key="input.sourceName"
                        :color="obsStore.obsVideoInputAssignments[selectedFeedIndex][selectedCapture.type === 'game' ? 'gameCaptures' : 'cameraCaptures'][selectedCapture.index]?.sourceName === input.sourceName ? 'blue' : 'secondary'"
                        class="m-t-8"
                        clickable
                        @click="setVideoFeedAssignment(input.sourceName)"
                    >
                        {{ input.sourceName }}
                    </ipl-space>
                </ipl-space>
            </transition>

            <ipl-space
                style="overflow-y: auto; height: 100%; box-sizing: border-box; transition: opacity 250ms"
                :style="{ opacity: selectedCapture == null ? '1' : '0.25' }"
            >
                <ipl-space
                    v-for="(layout, key) in layouts"
                    :color="activeGameLayout === key ? 'blue' : 'secondary'"
                    :key="key"
                    class="layout-item"
                    clickable
                    @click="obsStore.setActiveGameLayout(selectedFeedIndex, key)"
                >
                    <div class="layout-name">{{ layout.name }}</div>
                    <div class="layout-stats">
                        <font-awesome-icon icon="video" fixed-width /> {{ layout.cameraCaptureCount }}
                        <font-awesome-icon icon="gamepad" fixed-width /> {{ layout.gameCaptureCount }}
                    </div>
                </ipl-space>
            </ipl-space>
        </div>
        <ipl-space>
            <div
                v-if="selectedLayoutData != null"
                class="layout-preview"
                :style="{
                    gridTemplateAreas: selectedLayoutData.preview.gridTemplateAreas,
                    gridTemplateColumns: selectedLayoutData.preview.gridTemplateColumns,
                    gridTemplateRows: selectedLayoutData.preview.gridTemplateRows
                }"
            >
                <div
                    v-for="i in selectedLayoutData.cameraCaptureCount"
                    class="capture"
                    :style="{ gridArea: `cam-${i}` }"
                    :class="{
                        active: selectedCapture != null && selectedCapture.type === 'camera' && selectedCapture.index === i - 1,
                        unassigned: !isAssignedInput(obsStore.obsVideoInputAssignments[selectedFeedIndex].cameraCaptures[i - 1])
                    }"
                    @click="selectCapture('camera', i - 1)"
                >
                    <div><font-awesome-icon icon="video" fixed-width /><span class="capture-index">{{ i }}</span></div>
                </div>
                <div
                    v-for="i in selectedLayoutData.gameCaptureCount"
                    class="capture"
                    :style="{ gridArea: `game-${i}` }"
                    :class="{
                        active: selectedCapture != null && selectedCapture.type === 'game' && selectedCapture.index === i - 1,
                        unassigned: !isAssignedInput(obsStore.obsVideoInputAssignments[selectedFeedIndex].gameCaptures[i - 1])
                    }"
                    @click="selectCapture('game', i - 1)"
                >
                    <div><font-awesome-icon icon="gamepad" fixed-width /><span class="capture-index">{{ i }}</span></div>
                </div>
            </div>
        </ipl-space>
        <ipl-space class="layout vertical center-horizontal">
            <ipl-radio
                :model-value="String(selectedFeedIndex)"
                label="Feed"
                :options="feedOptions"
                name="feed"
                @update:model-value="selectedFeedIndex = Number($event)"
            />
        </ipl-space>
        <scene-switcher />
        <twitch-commercial-player />
        <source-cropping-dialog
            ref="sourceCroppingDialog"
            :selected-feed-index="selectedFeedIndex"
        />
    </div>
</template>

<script setup lang="ts">
import { IplButton, IplRadio, IplSpace } from '@iplsplatoon/vue-components';
import { layouts } from 'types/Layouts';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faVideo } from '@fortawesome/free-solid-svg-icons/faVideo';
import { faGamepad } from '@fortawesome/free-solid-svg-icons/faGamepad';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useObsStore } from 'client-shared/stores/ObsStore';
import cloneDeep from 'lodash/cloneDeep';
import { updateRefOnValueChange } from 'client-shared/helpers/StoreHelper';
import SceneSwitcher from '../../components/SceneSwitcher.vue';
import { faCrop } from '@fortawesome/free-solid-svg-icons/faCrop';
import SourceCroppingDialog from './SourceCroppingDialog.vue';
import { sendMessage } from 'client-shared/helpers/NodecgHelper';
import { VideoInputAssignment } from 'types/schemas';
import TwitchCommercialPlayer from '../../components/TwitchCommercialPlayer.vue';

library.add(faVideo, faGamepad, faCrop);

const wrapper = ref<HTMLElement>();

const obsStore = useObsStore();

const selectedFeedIndex = ref(0);
const feedOptions = [
    { name: 'Main Feed', value: '0' },
    { name: 'Feed 2', value: '1' },
    { name: 'Feed 3', value: '2' }
];

const activeGameLayout = ref<keyof typeof layouts | ''>('');
const selectedLayoutData = computed(() => activeGameLayout.value === '' ? null : layouts[activeGameLayout.value]);
updateRefOnValueChange(() => obsStore.activeGameLayouts[selectedFeedIndex.value], activeGameLayout);

const selectedCapture = ref<{ type: 'camera' | 'game', index: number } | null>(null);
const captureAssignmentInProgress = ref(false);

function selectCapture(type: 'camera' | 'game', index: number) {
    if (selectedCapture.value != null && type === selectedCapture.value.type && index === selectedCapture.value.index) {
        selectedCapture.value = null;
        return;
    }

    selectedCapture.value = { type, index };
}

const captureSelectDismissListener = (event: MouseEvent) => {
    if (!wrapper.value?.contains(event.target as HTMLElement)) {
        selectedCapture.value = null;
    }
}
onMounted(() => {
    window.addEventListener('click', captureSelectDismissListener);
});
onUnmounted(() => {
    window.removeEventListener('click', captureSelectDismissListener);
});

function isAssignedInput(assignment: VideoInputAssignment | null) {
    return assignment != null
        && assignment.sceneItemId != null
        && obsStore.obsState.videoInputs != null
        && obsStore.obsState.videoInputs.some(input => input.sourceName === assignment.sourceName);
}

async function setVideoFeedAssignment(sourceName: string) {
    if (selectedCapture.value == null || captureAssignmentInProgress.value) return;
    const newAssignments = cloneDeep(selectedCapture.value.type === 'game'
        ? obsStore.obsVideoInputAssignments[selectedFeedIndex.value].gameCaptures
        : obsStore.obsVideoInputAssignments[selectedFeedIndex.value].cameraCaptures);
    const oldLength = newAssignments.length;
    if (newAssignments[selectedCapture.value.index]?.sourceName === sourceName) {
        newAssignments[selectedCapture.value.index] = null;
    } else {
        newAssignments[selectedCapture.value.index] = { sourceName };
    }
    if (oldLength - 1 < selectedCapture.value.index) {
        newAssignments.fill(null, oldLength, selectedCapture.value.index);
    }

    captureAssignmentInProgress.value = true;
    try {
        await sendMessage('obs:setVideoInputAssignments', { type: selectedCapture.value.type, assignments: newAssignments, feedIndex: selectedFeedIndex.value });
    } finally {
        captureAssignmentInProgress.value = false;
    }
}

const sourceCroppingDialog = ref<InstanceType<typeof SourceCroppingDialog>>();
const allowCropping = computed(() => {
    if (
        obsStore.obsState.status !== 'CONNECTED'
        || obsStore.obsState.videoInputs == null
        || obsStore.obsState.videoInputs?.length === 0
        || selectedCapture.value == null
    ) return false;
    const selectedInput = obsStore.obsVideoInputAssignments[selectedFeedIndex.value][selectedCapture.value.type === 'game' ? 'gameCaptures' : 'cameraCaptures'][selectedCapture.value.index];
    return selectedInput != null && selectedInput.sceneItemId != null && obsStore.obsState.videoInputs.some(input => input.sourceName === selectedInput.sourceName);
});
</script>

<style scoped lang="scss">
@use '../../styles/dashboard-colors';

.layout-manager {
    overflow-y: hidden;
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    row-gap: 8px;
}

.layout-item {
    display: grid !important;
    grid-template-columns: 1fr auto;

    &:not(:last-child) {
        margin-bottom: 8px;
    }
}

.layout-stats {
    font-weight: 700;
}

.layout-preview {
    aspect-ratio: 2 / 1;
    width: 100%;
    display: grid;
    gap: 2px;
    border: 1px solid var(--ipl-input-color);
    padding: 2px;
    box-sizing: border-box;

    > .capture {
        background-color: rgba(34, 34, 34, 0.5);
        border: 1px solid var(--ipl-input-color);
        transition: border-color 100ms;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        user-select: none;

        &:hover {
            border-color: var(--ipl-input-color-hover);
        }

        &:active, &.active {
            border-color: var(--ipl-input-color-focus);
        }

        &.active {
            background-color: rgba(68, 68, 68, 0.5);
        }

        &.unassigned {
            color: dashboard-colors.$state-red;
        }

        .capture-index {
            margin-left: 4px;
        }
    }
}

.capture-select {
    position: absolute;
    width: calc(100% - 8px);
    max-height: calc(100% - 8px);
    bottom: 4px;
    left: 4px;
    overflow-y: auto;
    box-sizing: border-box;
    filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.25));
    transform: translateY(0);
    opacity: 1;
    z-index: 2;
}

.capture-select-reveal-enter-active,
.capture-select-reveal-leave-active {
    transition-duration: 150ms;
    transition-property: transform, opacity;
    transition-timing-function: ease-in-out;
}
.capture-select-reveal-leave-from,
.capture-select-reveal-enter-to {
    transform: translateY(0);
    opacity: 1;
}
.capture-select-reveal-leave-to {
    transform: translateY(-16px);
    opacity: 0;
}
.capture-select-reveal-enter-from {
    transform: translateY(16px);
    opacity: 0;
}
</style>
