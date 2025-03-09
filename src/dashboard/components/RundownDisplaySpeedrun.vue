<template>
    <ipl-space
        color="secondary"
        class="speedrun-display"
    >
        <div>
            <schedule-item-type-badge
                :schedule-item="props.speedrun"
                class="m-b-2"
            />
            <div class="speedrun-title">{{ props.speedrun.title }}</div>
            <div class="m-t-2">
                <span>est. {{ formatScheduleItemEstimate(props.speedrun) }}</span>
                <template v-if="props.speedrun.category != null">
                    – {{ props.speedrun.category }}
                </template>
            </div>
            <div class="m-t-4">
                <font-awesome-icon icon="gamepad" size="sm" fixed-width /> {{ talentStore.formatSpeedrunTeamList(props.speedrun) }}
            </div>
            <div
                v-if="props.speedrun.commentatorIds.length > 0"
                class="m-t-4"
            >
                <font-awesome-icon icon="headset" size="sm" fixed-width /> {{ talentStore.formatTalentIdList(props.speedrun.commentatorIds, 4) }}
            </div>
        </div>
        <div class="controls layout vertical center-vertical">
            <ipl-button
                v-if="!props.readonly"
                small
                inline
                color="transparent"
                class="edit-button"
                @click="scheduleItemEditor?.open(props.speedrun.id)"
            >
                <font-awesome-icon icon="pen-to-square" />
                <div>Edit</div>
            </ipl-button>
        </div>
    </ipl-space>
</template>

<script setup lang="ts">
import { Speedrun } from 'types/schemas';
import { formatScheduleItemEstimate } from 'client-shared/helpers/StringHelper';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { IplButton, IplSpace } from '@iplsplatoon/vue-components';
import { useTalentStore } from 'client-shared/stores/TalentStore';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faCircle } from '@fortawesome/free-solid-svg-icons/faCircle';
import { faGamepad } from '@fortawesome/free-solid-svg-icons/faGamepad';
import { faHeadset } from '@fortawesome/free-solid-svg-icons/faHeadset';
import ScheduleItemTypeBadge from './ScheduleItemTypeBadge.vue';
import { faPenToSquare } from '@fortawesome/free-solid-svg-icons';
import { inject } from 'vue';
import { ScheduleItemEditorInjectionKey } from '../helpers/Injections';

library.add(faCircle, faGamepad, faHeadset, faPenToSquare);

const talentStore = useTalentStore();

const scheduleItemEditor = inject(ScheduleItemEditorInjectionKey);

const props = withDefaults(defineProps<{
    isActive?: boolean
    speedrun: Speedrun
    readonly: boolean
}>(), {
    isActive: false
});
</script>

<style scoped lang="scss">
.speedrun-title {
    font-size: 1.5em;
    font-weight: 600;
}

.speedrun-display {
    position: relative;

    &:hover .controls {
        opacity: 0.9;
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

.edit-button {
    min-width: 50px;
}
</style>
