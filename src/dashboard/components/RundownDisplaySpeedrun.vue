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
            <ipl-badge
                v-if="timerStartTime != null || showScheduledStartTime"
                :color="timerStartTime?.color ?? 'blue'"
                :key="timerStartTime == null ? minutes : undefined"
                class="m-b-2"
            >
                <font-awesome-icon
                    :icon="timerStartTime != null ? 'stopwatch' : 'clock'"
                    size="xs"
                    class="m-r-4"
                />
                <template v-if="timerStartTime != null">
                    {{ timerStartTime.text }}
                </template>
                <template v-else>
                    {{ getScheduledStartTime() }}
                </template>
            </ipl-badge>
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
import { IplBadge, IplButton, IplSpace } from '@iplsplatoon/vue-components';
import { useTalentStore } from 'client-shared/stores/TalentStore';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faCircle } from '@fortawesome/free-solid-svg-icons/faCircle';
import { faGamepad } from '@fortawesome/free-solid-svg-icons/faGamepad';
import { faHeadset } from '@fortawesome/free-solid-svg-icons/faHeadset';
import { faClock } from '@fortawesome/free-solid-svg-icons/faClock';
import { faPenToSquare } from '@fortawesome/free-solid-svg-icons/faPenToSquare';
import { faStopwatch } from '@fortawesome/free-solid-svg-icons/faStopwatch';
import ScheduleItemTypeBadge from './ScheduleItemTypeBadge.vue';
import { computed, inject } from 'vue';
import { ScheduleItemEditorInjectionKey } from '../helpers/Injections';
import { DateTime } from 'luxon';
import { useScheduleStore } from 'client-shared/stores/ScheduleStore';
import { useMinutes } from '../helpers/useMinutes';

library.add(faCircle, faGamepad, faHeadset, faPenToSquare, faClock, faStopwatch);

const talentStore = useTalentStore();
const scheduleStore = useScheduleStore();
const minutes = useMinutes();

const scheduleItemEditor = inject(ScheduleItemEditorInjectionKey);

const props = withDefaults(defineProps<{
    isActive?: boolean
    speedrun: Speedrun
    readonly: boolean
}>(), {
    isActive: false
});

const timerStartTime = computed(() => {
    if (props.speedrun.id !== scheduleStore.activeSpeedrun?.id || props.speedrun.timerStartTime == null) return null;

    const scheduledStartTime = DateTime.fromISO(props.speedrun.scheduledStartTime);
    const timerStartTime = DateTime.fromISO(props.speedrun.timerStartTime);
    const isAheadOfSchedule = scheduledStartTime >= timerStartTime;
    const timeDiff = timerStartTime.set({ millisecond: 0 }).diff(scheduledStartTime).rescale().mapUnits(x => Math.abs(Math.round(x)));

    const timeDiffMinutes = timeDiff.shiftTo('minutes').minutes;
    let timeDiffColor: string;
    if (!isAheadOfSchedule) {
        timeDiffColor = timeDiffMinutes >= 10 ? 'red' : 'yellow';
    } else {
        timeDiffColor = timeDiffMinutes >= 20 ? 'yellow' : 'green';
    }

    const formattedDiff = timeDiff.toHuman({ unitDisplay: 'narrow' });
    return {
        text: isAheadOfSchedule ? `${formattedDiff} ahead of schedule` : `${formattedDiff} behind schedule`,
        color: timeDiffColor
    };
});

const showScheduledStartTime = computed(() => props.speedrun.id === scheduleStore.activeSpeedrun?.id || props.speedrun.id === scheduleStore.nextSpeedrun?.id);

function getScheduledStartTime() {
    const scheduledStartTime = DateTime.fromISO(props.speedrun.scheduledStartTime);
    const relativeStartTime = scheduledStartTime.toRelative({ unit: ['days', 'hours', 'minutes'] });
    const now = DateTime.now();
    const tomorrow = now.plus({ days: 1 });
    let date: string;
    if (scheduledStartTime.year === now.year && scheduledStartTime.month === now.month && scheduledStartTime.day === now.day) {
        date = 'Scheduled for ';
    } else if (scheduledStartTime.year === tomorrow.year && scheduledStartTime.month === tomorrow.month && scheduledStartTime.day === tomorrow.day) {
        date = 'Tomorrow at';
    } else {
        date = scheduledStartTime.toISODate() + ' at';
    }

    return `${date} ${scheduledStartTime.setLocale('en-GB').toLocaleString(DateTime.TIME_24_SIMPLE)} - ${relativeStartTime}`;
}
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
