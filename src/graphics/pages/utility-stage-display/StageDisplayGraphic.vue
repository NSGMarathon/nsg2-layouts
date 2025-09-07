<template>
    <div class="stage-display-layout">
        <div class="main-column">
            <size-displaying-block
                class="video-placeholder"
                :style="{ ...videoSize, opacity: placeholderOpacity }"
            >
                <template #label>
                    Stream Feed (Program/Preview)
                </template>
            </size-displaying-block>
            <div class="alert-wrapper">
                <transition name="alert">
                    <div
                        v-if="!stageDisplayStore.stageDisplayState.message.visible"
                        class="alert bg-panel"
                        :class="[
                            `mode-${stageDisplayStore.stageDisplayState.message.mode.toLowerCase()}`
                        ]"
                    >
                        <div class="alert-content">Messages will appear here</div>
                    </div>
                    <div
                        v-else
                        class="alert text-visible"
                        :key="alertFlashCounter + stageDisplayStore.stageDisplayState.message.color + (stageDisplayStore.stageDisplayState.message.mode === 'QUICK' ? stageDisplayStore.stageDisplayState.message.text : '')"
                        :class="[
                            `color-${stageDisplayStore.stageDisplayState.message.color.toLowerCase()}`,
                            `mode-${stageDisplayStore.stageDisplayState.message.mode.toLowerCase()}`
                        ]"
                    >
                        <opacity-swap-transition mode="default">
                            <div
                                :key="stageDisplayStore.stageDisplayState.message.text"
                                class="alert-content"
                            >
                                {{ stageDisplayStore.stageDisplayState.message.text }}
                            </div>
                        </opacity-swap-transition>
                    </div>
                </transition>
            </div>
        </div>
        <div class="secondary-column">
            <div class="bg-panel flavor-text">
                <div class="event-name layout horizontal center-vertical center-horizontal">{{ eventName }}</div>
                <div class="scene-name-display-wrapper layout horizontal center-vertical center-horizontal">
                    <opacity-swap-transition>
                        <div v-if="!previewModeEnabled">
                            May the odds be in your favor.
                        </div>
                        <div v-else>
                            <fitted-content
                                :max-width="useWideLayout ? 320 : bodySize.width - 200"
                                :align="useWideLayout ? 'center' : 'right'"
                            >
                                <b>Program:</b> {{ stageDisplayStore.obsState.currentScene ?? 'Unknown!' }}
                            </fitted-content>
                            <fitted-content
                                :max-width="useWideLayout ? 320 : bodySize.width - 200"
                                :align="useWideLayout ? 'center' : 'right'"
                            >
                                <font-awesome-icon :icon="useWideLayout ? 'caret-left' : 'caret-down'" class="m-r-8" /><b>Preview:</b> {{ stageDisplayStore.obsState.previewScene ?? 'Unknown!' }}
                            </fitted-content>
                        </div>
                    </opacity-swap-transition>
                </div>
            </div>
            <div class="chat-placeholder">
                <opacity-swap-transition>
                    <div
                        v-if="previewModeEnabled"
                        class="chat-overlays"
                    >
                        <div
                            v-if="scheduleStore.interstitialsBeforeActiveRun.length > 0"
                            class="chat-overlay"
                        >
                            <div class="chat-overlay-title bg-panel">
                                Coming up before this run...
                            </div>
                            <div
                                v-for="interstitial of scheduleStore.interstitialsBeforeActiveRun"
                                class="interstitial bg-panel"
                                :class="{ completed: interstitial.completed }"
                            >
                                <div class="title">{{ interstitial.title }}</div>
                                <div>{{ interstitial.description }}</div>
                                <div v-if="interstitial.talentIds.length > 0">Featuring {{ talentStore.formatTalentIdList(interstitial.talentIds, 4) }}</div>
                            </div>
                        </div>
                        <div class="chat-overlay">
                            <div class="chat-overlay-title bg-panel">
                                The team is setting up...
                            </div>
                            <div
                                v-for="category in todoListStore.techSetupTodoWithCompletionInfo.categories"
                                class="todo-category bg-panel"
                                :class="{ 'bg-panel-success': category.allCompleted }"
                            >
                                <div class="title">{{ category.name }}</div>
                                <div class="count"><span class="completed-count">{{ category.completedCount }}</span> / {{ category.items.length }}</div>
                            </div>
                        </div>
                    </div>
                </opacity-swap-transition>
                <size-displaying-block :style="{ opacity: placeholderOpacity }">
                    <template #label>
                        Chat Window
                    </template>
                </size-displaying-block>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Configschema } from 'types/schemas';
import { useStageDisplayStore } from 'client-shared/stores/StageDisplayStore';
import SizeDisplayingBlock from 'components/utility/SizeDisplayingBlock.vue';
import { useElementSize } from '../../helpers/useElementSize';
import { computed, ref } from 'vue';
import OpacitySwapTransition from 'components/OpacitySwapTransition.vue';
import FittedContent from 'components/FittedContent.vue';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faCaretDown } from '@fortawesome/free-solid-svg-icons/faCaretDown';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faCaretLeft } from '@fortawesome/free-solid-svg-icons/faCaretLeft';
import { useScheduleStore } from 'client-shared/stores/ScheduleStore';
import { useTalentStore } from 'client-shared/stores/TalentStore';
import { useTodoListStore } from 'client-shared/stores/TodoListStore';

library.add(faCaretDown, faCaretLeft);

const eventName = (nodecg.bundleConfig as Configschema).event?.name ?? 'Unnamed Event!';

const stageDisplayStore = useStageDisplayStore();
const scheduleStore = useScheduleStore();
const talentStore = useTalentStore();
const todoListStore = useTodoListStore();

const previewModeEnabled = computed(() => stageDisplayStore.stageDisplayState.mode === 'PREVIEW');

// We increment this counter to make this alert flash without actually changing its contents
// It's a little dinky, but it works
const alertFlashCounter = ref(0);
nodecg.listenFor('stage-display:flash', () => {
    alertFlashCounter.value++;
});

// todo: vary message font size based on character count
const bodySize = useElementSize(() => document.body);
const useWideLayout = computed(() => bodySize.value.width / bodySize.value.height > 1);
const videoSize = computed(() => {
    const aspect = 16 / 9;

    if (useWideLayout.value) {
        const maxWidth = bodySize.value.width - 354;
        const maxHeight = bodySize.value.height - 154;

        if (maxWidth / aspect > maxHeight) {
            return {
                width: `${maxHeight * aspect}px`,
                height: `${maxHeight}px`
            };
        } else {
            return {
                width: `${maxWidth}px`,
                height: `${maxWidth / aspect}px`
            };
        }
    } else {
        const maxHeight = bodySize.value.height - 500;

        if (bodySize.value.width / aspect > maxHeight) {
            return {
                minHeight: `${maxHeight}px`,
                width: `${maxHeight * aspect}px`
            };
        } else {
            return {
                width: `${bodySize.value.width}px`,
                minHeight: `${bodySize.value.width / aspect}px`
            };
        }
    }
});

const placeholderOpacity = computed(() => stageDisplayStore.stageDisplayState.showPlacementHelpers ? '1' : '0');
</script>

<style scoped lang="scss">
@keyframes alert-quick-opacity-overlay {
    0% {
        opacity: 1;
    }
    100% {
        opacity: 0;
    }
}

@media (min-aspect-ratio: 1 / 1) {
    // wide layout

    .video-wrapper {
        height: calc(100dvh - 150px);
    }

    .chat-placeholder {
        flex-grow: 1;
        font-size: 0.75em;
    }

    .alert-wrapper {
        margin-top: 4px;
        flex-grow: 1;
    }

    .flavor-text {
        padding: 8px;
    }
}

@media (max-aspect-ratio: 1 / 1) {
    // tall layout

    .stage-display-layout {
        flex-direction: column;
    }

    .main-column, .secondary-column {
        display: contents !important;
    }

    .flavor-text {
        order: -3;
        display: flex;
        justify-content: space-between;
        padding: 8px 16px;

        .scene-name-display-wrapper {
            text-align: right;
        }
    }

    .video-placeholder {
        order: -2;
        margin: 0 auto;
    }

    .chat-placeholder {
        height: 100%;
        order: -1;
        margin: 4px 0;
    }

    .alert-wrapper {
        height: 75%;
    }
}

.stage-display-layout {
    height: 100%;
    width: 100%;
    display: flex;
    overflow: hidden;
}

.main-column {
    display: flex;
    flex-direction: column;
    max-height: 100dvh;
    overflow: hidden;
}

.secondary-column {
    min-width: 350px;
    height: 100%;
    display: flex;
    flex-direction: column;
    margin-left: 4px;
    flex-grow: 1;
}

.flavor-text {
    text-align: center;
    font-size: 1.25em;
    line-height: 1.1em;

    .event-name {
        font-weight: 700;
    }

    .scene-name-display-wrapper {
        min-height: 3.3em;
    }
}

.alert-wrapper {
    min-width: 0;
    min-height: 150px;
    position: relative;
}

.alert {
    width: 100%;
    height: 100%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    color: #333;

    &.mode-quick.text-visible:after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: #fff;
        mix-blend-mode: lighten;
        opacity: 0;
        animation: alert-quick-opacity-overlay;
        animation-duration: 750ms;
        animation-timing-function: linear;
    }

    &.color-gray {
        background: linear-gradient(to bottom, #C0C0C0 0%, #D8D8D8 100%);
        color: #222;
    }

    &.color-red {
        background: linear-gradient(to bottom, #e74e36 0%, #F33737 100%);
        color: white;
        font-weight: 700;
    }

    &.color-yellow {
        background: linear-gradient(to bottom, #ffc700 0%, #FFE034 100%);
        color: #222;
        font-weight: 700;
    }
}

.mode-gentle.alert-leave-active, .mode-gentle.alert-enter-active {
    transition: opacity 5000ms linear;
}

.mode-quick.alert-leave-active, .mode-quick.alert-enter-active {
    transition: opacity 250ms cubic-bezier(0.16, 1, 0.3, 1);
}

.alert-leave-active {
    position: absolute;
}

.alert-leave-to, .alert-enter-from {
    opacity: 0;
}

.alert-enter-to {
    opacity: 1;
}

.alert-content {
    font-size: 5em;
    max-height: 100%;
    max-width: 100%;
    text-align: center;
    overflow-wrap: anywhere;
    position: absolute;
}

.chat-placeholder {
    position: relative;
}

.chat-placeholder .size-displaying-block {
    width: 100%;
    height: 100%;
}

.chat-overlays {
    position: absolute;
    z-index: 2;
    width: 100%;
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    font-size: 1.25em;
}

.chat-overlay-title {
    text-align: center;
    font-weight: 700;
    font-size: 1.25em;
}

.chat-overlay {
    width: 400px;
}

.chat-overlay > * {
    margin: 0 4px;
    padding: 8px;

    &:first-child {
        margin: 4px 4px 0 4px;
        border-radius: 8px 8px 0 0;
    }

    &:last-child {
        margin: 0 4px 4px 4px;
        border-radius: 0 0 8px 8px;
    }

    &:first-child:last-child {
        margin: 4px;
        border-radius: 8px;
    }
}

.interstitial {
    padding: 8px;
    font-size: 1.1em;
    margin: 0 4px;

    &.completed {
        filter: contrast(0.5);
        text-decoration: line-through;
    }

    .title {
        font-weight: 700;
        font-size: 1.1em;
    }
}

.todo-category {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 1.1em;

    .title {
        font-weight: 700;
    }

    .completed-count {
        font-size: 1.15em;
        font-weight: 700;
    }
}

.chat-overlay-leave-active {
    transition: transform 350ms ease-in;
}

.chat-overlay-enter-active {
    transition: transform 350ms ease-out;
}
</style>
