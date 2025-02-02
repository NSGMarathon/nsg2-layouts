<template>
    <ipl-dialog
        v-model:is-open="isOpen"
        class="source-cropping-dialog"
        :persistent="!loadingScreenshot && screenshotLoadingError == null"
    >
        <div
            v-if="loadingScreenshot"
            class="layout horizontal center-horizontal center-vertical"
            style="min-height: 200px;"
        >
            <ipl-spinner color="white" class="m-r-8" /> Loading...
        </div>
        <template v-else-if="screenshotLoadingError != null">
            <ipl-message type="error">
                {{ screenshotLoadingError }}
            </ipl-message>
            <ipl-button
                class="m-t-8"
                color="red"
                label="Close"
                @click="isOpen = false"
            />
        </template>
        <template v-else>
            <div class="zoom-overflow-wrapper">
                <div
                    class="crop-wrapper"
                    ref="cropWrapper"
                    :style="{ '--zoom-factor': zoom }"
                >
                    <div
                        class="crop-outline"
                        ref="cropOutlineElem"
                        :class="{ active: croppingActive }"
                        @mousedown="onCropOutlineClick"
                    >
                        <div class="side top" />
                        <div class="side right" />
                        <div class="side bottom" />
                        <div class="side left" />
                        <template v-if="selectedCapture?.type === 'camera'">
                            <div class="camera-crop-preview side top" />
                            <div class="camera-crop-preview side right" />
                            <div class="camera-crop-preview side bottom" />
                            <div class="camera-crop-preview side left" />
                        </template>
                        <div class="handle top left" />
                        <div class="handle top" />
                        <div class="handle top right" />
                        <div class="handle left" />
                        <div class="handle right" />
                        <div class="handle bottom left" />
                        <div class="handle bottom" />
                        <div class="handle bottom right" />
                        <div class="crop-drag-box" />
                    </div>
                    <img
                        :src="sourceScreenshot"
                        @load="onSourceScreenshotLoad"
                    />
                </div>
            </div>
            <div class="m-t-8 cropping-controls layout vertical center-horizontal">
                <div class="layout horizontal max-width center-vertical center-horizontal">
                    <ipl-radio
                        v-model="selectedAspectRatio"
                        :options="aspectRatioOptions"
                        name="aspect-ratio"
                        label="Lock aspect ratio"
                        style="min-width: 200px; margin-top: -8px;"
                    />
                    <ipl-button
                        class="m-l-8"
                        style="max-width: 200px;"
                        @click="centerHorizontal"
                    >
                        <font-awesome-icon icon="left-right" fixed-width />
                        Center horizontal
                    </ipl-button>
                    <ipl-button
                        class="m-l-8"
                        style="max-width: 200px;"
                        @click="centerVertical"
                    >
                        <font-awesome-icon icon="up-down" fixed-width />
                        Center vertical
                    </ipl-button>
                </div>
                <div
                    class="layout horizontal max-width center-horizontal"
                    style="max-width: 850px; margin: 8px 0 auto;"
                >
                    <ipl-button
                        icon="magnifying-glass-plus"
                        @click="zoom = Math.min(10, zoom + 0.5)"
                    />
                    <div class="m-l-8 m-t-8 text-center" style="min-width: 40px">{{ zoom }}x</div>
                    <ipl-button
                        icon="magnifying-glass-minus"
                        class="m-l-8"
                        @click="zoom = Math.max(0.5, zoom - 0.5)"
                    />
                    <ipl-button
                        label="Apply"
                        color="green"
                        class="m-l-8"
                        style="max-width: 100px"
                        @click="apply"
                    />
                    <ipl-button
                        label="Reset"
                        color="red"
                        class="m-l-8"
                        style="max-width: 100px"
                        @click="resetCrop"
                    />
                    <ipl-button
                        label="Cancel"
                        color="red"
                        class="m-l-8"
                        style="max-width: 100px"
                        @click="isOpen = false"
                    />
                </div>
            </div>
        </template>
    </ipl-dialog>
</template>

<script setup lang="ts">
import { IplButton, IplDialog, IplMessage, IplRadio, IplSpinner } from '@iplsplatoon/vue-components';
import { onUnmounted, ref, watch } from 'vue';
import { sendMessage } from 'client-shared/helpers/NodecgHelper';
import { useObsStore } from 'client-shared/stores/ObsStore';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faMagnifyingGlassPlus } from '@fortawesome/free-solid-svg-icons/faMagnifyingGlassPlus';
import { faMagnifyingGlassMinus } from '@fortawesome/free-solid-svg-icons/faMagnifyingGlassMinus';
import { faUpDown } from '@fortawesome/free-solid-svg-icons/faUpDown';
import { faLeftRight } from '@fortawesome/free-solid-svg-icons/faLeftRight';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { VideoInputAssignment } from 'types/schemas';
import { ObsSceneItemTransform } from 'types/obs';

library.add(faMagnifyingGlassPlus, faMagnifyingGlassMinus, faUpDown, faLeftRight);

const props = defineProps<{
    selectedFeedIndex: number
}>();

type CropOutlineData = { width: number, height: number, top: number, left: number };

const cropWrapper = ref<HTMLDataElement | null>();

const selectedAspectRatio = ref('off');
const aspectRatioOptions = [
    { name: 'Off', value: 'off' },
    { name: '16:9', value: '169' },
    { name: '4:3', value: '43' },
    { name: '3:2', value: '32' },
    { name: '2:1', value: '21' }
];
function getNumericAspectRatio() {
    switch (selectedAspectRatio.value) {
        case '169':
            return 16 / 9;
        case '43':
            return 4 / 3;
        case '32':
            return 3 / 2;
        case '21':
            return 2;
        default:
            return null;
    }
}
watch(selectedAspectRatio, () => {
    const numericAspectRatio = getNumericAspectRatio();
    if (numericAspectRatio == null || cropOutlineData == null || sceneItemTransform == null) return;
    const sourceAspectRatio = sceneItemTransform.sourceWidth / sceneItemTransform.sourceHeight;
    if (sourceAspectRatio < numericAspectRatio) {
        const newHeight = cropOutlineData.width / numericAspectRatio * sourceAspectRatio;
        cropOutlineData.height = newHeight;
        cropOutlineData.top = Math.min(cropOutlineData.top, 1 - newHeight);
        updateCropOutlineRef();
    } else {
        const newWidth = cropOutlineData.height * numericAspectRatio / sourceAspectRatio;
        cropOutlineData.width = newWidth;
        cropOutlineData.left = Math.min(cropOutlineData.left, 1 - newWidth);
        updateCropOutlineRef();
    }
});

const obsStore = useObsStore();
const isOpen = ref(false);
const selectedSourceName = ref<string | null>(null);
const selectedSceneItemId = ref<number | null>(null);
const loadingScreenshot = ref(false);
const sourceScreenshot = ref('');
const screenshotLoadingError = ref<string | null>(null);
let sceneItemTransform: ObsSceneItemTransform | null = null;

const cropOutlineElem = ref<HTMLDivElement>();
let sides: NodeListOf<HTMLElement> | null = null;
let handles: NodeListOf<HTMLElement> | null = null;
let dragBox: HTMLElement | null = null;
watch(cropOutlineElem, newValue => {
    if (newValue) {
        sides = newValue.querySelectorAll('.side');
        handles = newValue.querySelectorAll('.handle');
        dragBox = newValue.querySelector('.crop-drag-box');
    } else {
        sides = null;
        handles = null;
    }
});

let cropOutlineData: CropOutlineData | null = null;
let initialCropOutline: CropOutlineData | null = null;
let dragSideX: 'left' | 'right' | null = null;
let dragSideY: 'top' | 'bottom' | null = null;
let dragStartPosition: { x: number, y: number } | null = null;
let cropWrapperSize: { width: number, height: number } | null = null;
const zoom = ref(1);
const croppingActive = ref(false);

const selectedCapture = ref<{ type: 'camera' | 'game', index: number } | null>(null);

function resetCrop() {
    cropOutlineData = {
        width: 1,
        height: 1,
        top: 0,
        left: 0
    };
    updateCropOutlineRef();
    selectedAspectRatio.value = 'off';
}

watch(isOpen, async (newValue) => {
    const videoInputsScene = obsStore.obsConfig.gameLayoutVideoFeedScenes[props.selectedFeedIndex];
    if (videoInputsScene != null && newValue && selectedSourceName.value != null && selectedSceneItemId.value != null) {
        sourceScreenshot.value = '';
        loadingScreenshot.value = true;
        zoom.value = 1;
        selectedAspectRatio.value = 'off';
        try {
            const sceneItemData = await Promise.all([
                sendMessage('obs:getSourceScreenshot', { sourceName: selectedSourceName.value }),
                sendMessage('obs:getSceneItemTransform', { sceneName: videoInputsScene, sceneItemId: selectedSceneItemId.value })
            ]);
            screenshotLoadingError.value = null;
            sourceScreenshot.value = sceneItemData[0];
            sceneItemTransform = sceneItemData[1];
            cropOutlineData = {
                width: ((sceneItemTransform!.sourceWidth - sceneItemTransform!.cropLeft - sceneItemTransform!.cropRight) / sceneItemTransform!.sourceWidth),
                height: ((sceneItemTransform!.sourceHeight - sceneItemTransform!.cropTop - sceneItemTransform!.cropBottom) / sceneItemTransform!.sourceHeight),
                left: (sceneItemTransform!.cropLeft / sceneItemTransform!.sourceWidth),
                top: (sceneItemTransform!.cropTop / sceneItemTransform!.sourceHeight)
            }
            loadingScreenshot.value = false;
        } catch (e) {
            screenshotLoadingError.value = 'message' in e ? e.message : String(e);
            loadingScreenshot.value = false;
        }

        window.document.addEventListener('mouseup', onWindowMouseup);
        window.document.addEventListener('mousemove', onWindowMouseMove);
    } else {
        window.document.removeEventListener('mouseup', onWindowMouseup);
        window.document.removeEventListener('mousemove', onWindowMouseMove);
    }
});

function onSourceScreenshotLoad() {
    if (cropWrapper.value != null) {
        cropWrapperSize = { width: cropWrapper.value.clientWidth, height: cropWrapper.value.clientHeight };
        updateCropOutlineRef();
    } else {
        cropWrapperSize = null;
    }
}

function onCropOutlineClick(e: PointerEvent) {
    if (cropOutlineData == null) return;
    const classList = (e.target as HTMLElement).classList;
    if (classList.contains('handle') || classList.contains('crop-drag-box')) {
        croppingActive.value = true;
        dragStartPosition = { y: e.clientY, x: e.clientX };
        initialCropOutline = { ...cropOutlineData };

        if (classList.contains('right')) {
            dragSideX = 'right';
        } else if (classList.contains('left')) {
            dragSideX = 'left';
        } else {
            dragSideX = null;
        }

        if (classList.contains('top')) {
            dragSideY = 'top';
        } else if (classList.contains('bottom')) {
            dragSideY = 'bottom';
        } else {
            dragSideY = null;
        }

        const cropWrapper = (e.target as HTMLElement).parentElement?.parentElement;
        if (cropWrapper != null) {
            cropWrapperSize = { width: cropWrapper.clientWidth, height: cropWrapper.clientHeight };
        } else {
            cropWrapperSize = null;
        }
    }
}

function onWindowMouseup() {
    dragSideX = null;
    dragSideY = null;
    dragStartPosition = null;
    croppingActive.value = false;
}
function onWindowMouseMove(e: PointerEvent) {
    if (dragStartPosition == null || cropWrapperSize == null || initialCropOutline == null || sceneItemTransform == null) return;
    const aspectRatio = getNumericAspectRatio();
    const newCropOutline = { ...initialCropOutline };

    // i hate this logic with a passion but it _works_ so i won't touch it any further. i've got an event to run, maybe three...

    if (dragSideX == null && dragSideY == null) {
        newCropOutline.left = Math.min(1 - newCropOutline.width, Math.max(0, newCropOutline.left - (dragStartPosition.x - e.clientX) / zoom.value / cropWrapperSize.width));
        newCropOutline.top = Math.min(1 - newCropOutline.height, Math.max(0, newCropOutline.top - (dragStartPosition.y - e.clientY) / zoom.value / cropWrapperSize.height));
    } else if (aspectRatio == null) {
        // handle dragging with no aspect ratio constraints
        if (dragSideX === 'right') {
            newCropOutline.width = Math.min(1 - newCropOutline.left, Math.max(0, newCropOutline.width - (dragStartPosition.x - e.clientX) / zoom.value / cropWrapperSize.width));
        } else if (dragSideX === 'left') {
            newCropOutline.width = Math.min(newCropOutline.left + newCropOutline.width, Math.max(0, newCropOutline.width + (dragStartPosition.x - e.clientX) / zoom.value / cropWrapperSize.width));
            newCropOutline.left = Math.min(initialCropOutline.width + initialCropOutline.left, Math.max(0, newCropOutline.left - (dragStartPosition.x - e.clientX) / zoom.value / cropWrapperSize.width));
        }
        if (dragSideY === 'bottom') {
            newCropOutline.height = Math.min(1 - newCropOutline.top, Math.max(0, newCropOutline.height - (dragStartPosition.y - e.clientY) / zoom.value / cropWrapperSize.height));
        } else if (dragSideY === 'top') {
            newCropOutline.height = Math.min(newCropOutline.top + newCropOutline.height, Math.max(0, newCropOutline.height + (dragStartPosition.y - e.clientY) / zoom.value / cropWrapperSize.height));
            newCropOutline.top = Math.min(initialCropOutline.height + initialCropOutline.top, Math.max(0, newCropOutline.top - (dragStartPosition.y - e.clientY) / zoom.value / cropWrapperSize.height));
        }
    } else {
        // handle dragging WITH aspect ratio constraints
        const sourceAspectRatio = sceneItemTransform.sourceWidth / sceneItemTransform.sourceHeight;
        if (dragSideX != null) {
            if (dragSideX === 'left') {
                newCropOutline.left = Math.min(initialCropOutline.width + initialCropOutline.left, Math.max(0, newCropOutline.left - (dragStartPosition.x - e.clientX) / zoom.value / cropWrapperSize.width))
                newCropOutline.width = Math.min(initialCropOutline.left + initialCropOutline.width, Math.max(0, newCropOutline.width + (dragStartPosition.x - e.clientX) / zoom.value / cropWrapperSize.width));
            } else {
                newCropOutline.width = Math.min(1 - newCropOutline.left, Math.max(0, newCropOutline.width - (dragStartPosition.x - e.clientX) / zoom.value / cropWrapperSize.width));
            }
            newCropOutline.height = newCropOutline.width / aspectRatio * sourceAspectRatio;
            if (dragSideY === 'top') {
                newCropOutline.top = newCropOutline.top - (newCropOutline.height - initialCropOutline.height);
            } else if (dragSideY == null) {
                newCropOutline.top = newCropOutline.top - (newCropOutline.height - initialCropOutline.height) / 2;
            }
            if (newCropOutline.height + newCropOutline.top > 1) {
                if (dragSideY == null) {
                    const remainingInitialHeight = 1 - (initialCropOutline.top + initialCropOutline.height);
                    newCropOutline.top = initialCropOutline.top - remainingInitialHeight;
                    newCropOutline.height = initialCropOutline.height + remainingInitialHeight * 2;
                    if (dragSideX === 'left') {
                        newCropOutline.left = initialCropOutline.left - remainingInitialHeight * 2;
                    }
                } else {
                    newCropOutline.height = 1 - newCropOutline.top;
                }
                newCropOutline.width = newCropOutline.height * aspectRatio / sourceAspectRatio;
                if (dragSideY === 'bottom' && dragSideX === 'left') {
                    newCropOutline.left = initialCropOutline.left - (newCropOutline.width - initialCropOutline.width);
                }
            } else if (newCropOutline.top < 0) {
                if (dragSideY == null) {
                    newCropOutline.height = newCropOutline.height + newCropOutline.top * 2;
                } else {
                    newCropOutline.height = newCropOutline.height + newCropOutline.top;
                }
                newCropOutline.width = newCropOutline.height * aspectRatio / sourceAspectRatio;
                if (dragSideY === 'bottom') {
                    newCropOutline.top = initialCropOutline.top;
                } else {
                    newCropOutline.top = 0;
                    if (dragSideX === 'left') {
                        newCropOutline.left = initialCropOutline.left - (newCropOutline.width - initialCropOutline.width);
                    }
                }
            }
        } else {
            if (dragSideY === 'top') {
                newCropOutline.height = Math.min(initialCropOutline.top + initialCropOutline.height, Math.max(0, newCropOutline.height + ((dragStartPosition.y - e.clientY)) / zoom.value / cropWrapperSize.height));
                newCropOutline.top = Math.max(0, newCropOutline.top - (newCropOutline.height - initialCropOutline.height));
            } else {
                newCropOutline.height = Math.min(1 - initialCropOutline.top, Math.max(0, newCropOutline.height - ((dragStartPosition.y - e.clientY)) / zoom.value / cropWrapperSize.height));
            }
            newCropOutline.width = newCropOutline.height / (1 / aspectRatio) * (1 / sourceAspectRatio);
            newCropOutline.left = newCropOutline.left - (newCropOutline.width - initialCropOutline.width) / 2;

            if (newCropOutline.left < 0 || newCropOutline.left + newCropOutline.width > 1) {
                let remainingSpace: number;
                if (newCropOutline.left < 0) {
                    newCropOutline.left = 0;
                    remainingSpace = initialCropOutline.left;
                } else {
                    remainingSpace = 1 - (initialCropOutline.width + initialCropOutline.left);
                    newCropOutline.left = initialCropOutline.left - remainingSpace;
                }

                newCropOutline.width = initialCropOutline.width + remainingSpace * 2;
                newCropOutline.height = newCropOutline.width * (1 / aspectRatio) / (1 / sourceAspectRatio);
                if (dragSideY === 'top') {
                    newCropOutline.top = initialCropOutline.top - (newCropOutline.height - initialCropOutline.height);
                }
            }
        }
    }

    cropOutlineData = newCropOutline;
    updateCropOutlineRef();
}
onUnmounted(() => {
    window.document.removeEventListener('mouseup', onWindowMouseup);
    window.document.removeEventListener('mousemove', onWindowMouseMove);
});

function centerHorizontal() {
    if (cropOutlineData == null) return;
    cropOutlineData.left = (1 - cropOutlineData.width) / 2;
    updateCropOutlineRef();
}

function centerVertical() {
    if (cropOutlineData == null) return;
    cropOutlineData.top = (1 - cropOutlineData.height) / 2;
    updateCropOutlineRef();
}

function updateCropOutlineRef() {
    if (cropOutlineData == null || cropWrapperSize == null || sides == null || handles == null) return;
    const startX = cropOutlineData.left * cropWrapperSize.width;
    const startY = cropOutlineData.top * cropWrapperSize.height;
    const scaleX = cropOutlineData.width * cropWrapperSize.width;
    const scaleY = cropOutlineData.height * cropWrapperSize.height;
    const endY = (cropOutlineData.top + cropOutlineData.height) * cropWrapperSize.height;
    const endX = (cropOutlineData.left + cropOutlineData.width) * cropWrapperSize.width;
    const centerX = (cropOutlineData.left + cropOutlineData.width / 2) * cropWrapperSize.width;
    const centerY = (cropOutlineData.top + cropOutlineData.height / 2) * cropWrapperSize.height;

    if (
        sides.length > 4
        && cropOutlineData.height > 0
        && selectedCapture.value != null
    ) {
        const inputSlotPosition = obsStore.obsVideoInputPositions[props.selectedFeedIndex][`${selectedCapture.value.type}Captures`][selectedCapture.value.index];
        const inputAspectRatio = inputSlotPosition.width / inputSlotPosition.height;
        const cropAspectRatio = scaleX / scaleY;
        const fc = inputAspectRatio / cropAspectRatio;
        if (fc === 1) {
            updateTransforms(sides[4], { x: startX, y: startY }, { x: scaleX, y: 1 });
            updateTransforms(sides[5], { x: endX, y: startY }, { x: 1, y: scaleY });
            updateTransforms(sides[6], { x: startX, y: endY }, { x: scaleX, y: 1 });
            updateTransforms(sides[7], { x: startX, y: startY }, { x: 1, y: scaleY });
        } else if (fc > 1) {
            const cropPreviewScaleY = scaleY / fc;
            const deltaY = (scaleY - cropPreviewScaleY) / 2;
            updateTransforms(sides[4], { x: startX, y: startY + deltaY }, { x: scaleX, y: 1 });
            updateTransforms(sides[5], { x: endX, y: startY + deltaY }, { x: 1, y: cropPreviewScaleY });
            updateTransforms(sides[6], { x: startX, y: endY - deltaY }, { x: scaleX, y: 1 });
            updateTransforms(sides[7], { x: startX, y: startY + deltaY }, { x: 1, y: cropPreviewScaleY });
        } else {
            const cropPreviewScaleX = scaleX * fc;
            const deltaX = (scaleX - cropPreviewScaleX) / 2;
            updateTransforms(sides[4], { x: startX + deltaX, y: startY }, { x: cropPreviewScaleX, y: 1 });
            updateTransforms(sides[5], { x: endX - deltaX, y: startY }, { x: 1, y: scaleY });
            updateTransforms(sides[6], { x: startX + deltaX, y: endY }, { x: cropPreviewScaleX, y: 1 });
            updateTransforms(sides[7], { x: startX + deltaX, y: startY }, { x: 1, y: scaleY });
        }
    }

    updateTransforms(dragBox!, { x: startX, y: startY }, { x: scaleX, y: scaleY });
    updateTransforms(sides[0], { x: startX, y: startY }, { x: scaleX, y: 1 });
    updateTransforms(sides[1], { x: endX, y: startY }, { x: 1, y: scaleY });
    updateTransforms(sides[2], { x: startX, y: endY }, { x: scaleX, y: 1 });
    updateTransforms(sides[3], { x: startX, y: startY }, { x: 1, y: scaleY });
    updateTransforms(handles[0], { x: startX, y: startY });
    updateTransforms(handles[1], { x: centerX, y: startY });
    updateTransforms(handles[2], { x: endX, y: startY });
    updateTransforms(handles[3], { x: startX, y: centerY });
    updateTransforms(handles[4], { x: endX, y: centerY });
    updateTransforms(handles[5], { x: startX, y: endY });
    updateTransforms(handles[6], { x: centerX, y: endY });
    updateTransforms(handles[7], { x: endX, y: endY });
}

function updateTransforms(element: HTMLElement, translations: { x: number, y: number }, scales?: { x: number, y: number }) {
    element.style.setProperty('--tx', String(translations.x));
    element.style.setProperty('--ty', String(translations.y));
    if (scales) {
        element.style.setProperty('--sx', String(scales.x));
        element.style.setProperty('--sy', String(Math.max(1, scales.y)));
    }
}

function open(inputAssignment: VideoInputAssignment, selectedCaptureData: { type: 'camera' | 'game', index: number }) {
    if (inputAssignment.sceneItemId == null) return;
    selectedCapture.value = selectedCaptureData;
    selectedSourceName.value = inputAssignment.sourceName;
    selectedSceneItemId.value = inputAssignment.sceneItemId;
    isOpen.value = true;
}

async function apply() {
    try {
        const videoInputsScene = obsStore.obsConfig.gameLayoutVideoFeedScenes[props.selectedFeedIndex];
        if (sceneItemTransform == null || cropOutlineData == null || videoInputsScene == null || selectedSceneItemId.value == null) return;
        const height = sceneItemTransform.sourceHeight;
        const width = sceneItemTransform.sourceWidth;
        await sendMessage('obs:setSceneItemCrop', {
            sceneItemId: selectedSceneItemId.value,
            sceneName: videoInputsScene,
            crop: {
                cropTop: Math.round(cropOutlineData.top * height),
                cropBottom: Math.round((1 - cropOutlineData.top - cropOutlineData.height) * height),
                cropLeft: Math.round(cropOutlineData.left * width),
                cropRight: Math.round((1 - cropOutlineData.left - cropOutlineData.width) * width)
            }
        });
    } finally {
        isOpen.value = false;
    }
}

defineExpose({
    open
});
</script>

<style lang="scss">
.source-cropping-dialog {
    width: 90vw;
    height: 90vh;
    overflow: hidden !important;

    > .content {
        box-sizing: border-box;
        overflow: hidden;
    }
}
</style>

<style scoped lang="scss">
.cropping-controls {
    position: sticky;
    left: 0;
    bottom: 0;
}

.zoom-overflow-wrapper {
    height: calc(90vh - 115px);
    width: calc(90vw - 50px);
    margin: 0 auto;
    overflow: auto;
}

.crop-wrapper {
    position: relative;
    border: 1px solid var(--ipl-input-color);
    box-sizing: border-box;
    width: max-content;
    margin: 0 auto;
    zoom: var(--zoom-factor);

    img {
        height: calc(90vh - 125px);
        user-select: none;
        pointer-events: none;
        image-rendering: pixelated;
    }

    .crop-outline {
        box-sizing: border-box;
        position: absolute;
        top: 0;
        left: 0;
        user-select: none;
        will-change: transform;

        &.active {
            > .handle {
                opacity: 0.1;
            }

            > .crop-drag-box {
                cursor: grabbing;
            }
        }

        .side {
            width: 1px;
            height: 1px;
            background-color: red;
            transform-origin: top left;
            position: absolute;
            transform: translate3d(calc(var(--tx) * 1px), calc(var(--ty) * 1px), 0) scale(var(--sx), var(--sy));

            &.left, &.right {
                width: calc(1px / var(--zoom-factor));
            }
            &.bottom, &.top {
                height: calc(1px / var(--zoom-factor));
            }

            &.camera-crop-preview {
                background-color: green;
            }
        }

        .crop-drag-box {
            width: 1px;
            height: 1px;
            cursor: grab;
            transform-origin: top left;
            z-index: 1;
            position: absolute;
            transform: translate3d(calc(var(--tx) * 1px), calc(var(--ty) * 1px), 0) scale(var(--sx), var(--sy));
        }
    }

    .handle {
        position: absolute;
        top: 0;
        left: 0;
        width: calc(10px / var(--zoom-factor));
        height: calc(10px / var(--zoom-factor));
        margin-left: calc((10px / var(--zoom-factor)) * -0.5);
        margin-top: calc((10px / var(--zoom-factor)) * -0.5);
        background-color: red;
        user-select: none;
        z-index: 2;
        transform: translate3d(calc(var(--tx) * 1px), calc(var(--ty) * 1px), 0);
    }
    .handle.top {
        cursor: ns-resize;
    }
    .handle.bottom {
        cursor: ns-resize;
    }
    .handle.left {
        cursor: ew-resize;
    }
    .handle.right {
        cursor: ew-resize;
    }
    .handle.top.left {
        cursor: nwse-resize;
    }
    .handle.bottom.right {
        cursor: nwse-resize;
    }
    .handle.top.right {
        cursor: nesw-resize;
    }
    .handle.bottom.left {
        cursor: nesw-resize;
    }
}
</style>
