<template>
    <ipl-space
        color="secondary"
        class="interstitial-display"
        :class="{ 'allow-completion-change': props.allowCompletionChange }"
        :style="{ opacity: props.allowCompletionChange && props.interstitial.completed ? '0.5' : '1' }"
    >
        <div>
            <schedule-item-type-badge
                :schedule-item="props.interstitial"
                class="m-b-2"
            />
            <div class="interstitial-title">{{ props.interstitial.title }}</div>
            <div
                v-if="props.interstitial.talentIds.length > 0 || props.interstitial.type === 'OTHER'"
                class="m-t-2 overflow-anywhere"
            >
                <font-awesome-icon icon="headset" size="sm" fixed-width />
                {{ props.interstitial.talentIds.length === 0 ? 'No talent!' : talentStore.formatTalentIdList(props.interstitial.talentIds, 4) }}
            </div>
        </div>
        <div
            v-if="!props.readonly"
            class="controls edit-button-wrapper layout horizontal center-vertical"
        >
            <ipl-button
                small
                inline
                color="transparent"
                class="edit-button"
                @click="scheduleItemEditor?.open(props.interstitial.id)"
            >
                <font-awesome-icon icon="pen-to-square" />
                <div>Edit</div>
            </ipl-button>
        </div>
        <div
            v-if="props.allowCompletionChange"
            class="controls layout horizontal center-vertical completion-button-wrapper"
        >
            <ipl-button
                small
                :color="props.interstitial.completed ? 'red' : 'green'"
                class="completion-button"
                @click="setCompleted(!props.interstitial.completed)"
            >
                <font-awesome-icon
                    :icon="props.interstitial.completed ? 'rotate-left' : 'check'"
                    size="xl"
                />
                <div>{{ props.interstitial.completed ? 'Not completed' : 'Complete' }}</div>
            </ipl-button>
        </div>
    </ipl-space>
</template>

<script setup lang="ts">
import { IplButton, IplSpace } from '@iplsplatoon/vue-components';
import { OtherScheduleItem } from 'types/schemas';
import { useTalentStore } from 'client-shared/stores/TalentStore';
import { sendMessage } from 'client-shared/helpers/NodecgHelper';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faRotateLeft } from '@fortawesome/free-solid-svg-icons/faRotateLeft';
import ScheduleItemTypeBadge from './ScheduleItemTypeBadge.vue';
import { faPenToSquare } from '@fortawesome/free-solid-svg-icons';
import { inject } from 'vue';
import { ScheduleItemEditorInjectionKey } from '../helpers/Injections';
import { faHeadset } from '@fortawesome/free-solid-svg-icons/faHeadset';

library.add(faCheck, faRotateLeft, faPenToSquare, faHeadset);

const talentStore = useTalentStore();

const scheduleItemEditor = inject(ScheduleItemEditorInjectionKey);

const props = withDefaults(defineProps<{
    allowCompletionChange?: boolean
    interstitial: OtherScheduleItem
    readonly: boolean
}>(), {
    allowCompletionChange: false
});

async function setCompleted(completed: boolean) {
    await sendMessage('schedule:setInterstitialCompleted', { scheduleItemId: props.interstitial.id, completed });
}
</script>

<style scoped lang="scss">
.interstitial-title {
    font-size: 1.25em;
    font-weight: 600;
    overflow-wrap: anywhere;
}

.interstitial-display {
    display: flex;
    align-items: center;
    position: relative;

    > *:first-child {
        flex-grow: 1;
    }

    &:hover .controls {
        opacity: 0.9;
    }

    &.allow-completion-change {
        .edit-button-wrapper {
            right: 103px;
        }

        .completion-button-wrapper {
            position: unset;
            opacity: 1;
            padding-right: 0;
        }
    }
}

.controls {
    opacity: 0;
    transition: opacity 150ms;
    position: absolute;
    right: 0;
    top: 0;
    height: 100%;
    padding: 0 8px;
    background-color: var(--ipl-bg-secondary);
    border-radius: 8px;
}

.completion-button {
    width: 95px;

    &:not(:first-child) {
        margin-left: 4px;
    }
}

.edit-button {
    min-width: 50px;
}
</style>
