<template>
    <ipl-dialog
        v-model:is-open="isOpen"
        style="width: 750px"
    >
        <ipl-space color="secondary">
            <ipl-input
                v-model="query"
                name="query"
                theme="large"
                placeholder="Search the schedule..."
                type="search"
            />
            <div class="m-t-8 layout horizontal center-horizontal">
                <ipl-checkbox
                    v-model="searchByTalentName"
                    small
                    label="Search by talent name"
                    class="m-r-4"
                />
                <ipl-checkbox
                    v-model="searchByTitle"
                    small
                    label="Search by title"
                />
            </div>
        </ipl-space>
        <ipl-space
            color="secondary"
            class="m-t-8 results-display"
        >
            <div
                v-if="searchResults.length === 0"
                class="text-low-emphasis text-center"
            >
                No results found...
            </div>
            <ipl-expanding-space
                v-for="result in searchResults"
                :key="result.id"
            >
                <template #title>
                    <span class="item-index">#{{ result.index + 1 }}: </span>
                    <schedule-item-type-badge :schedule-item="result" class="m-l-4" />
                    {{ result.title }}
                    <span class="text-low-emphasis">
                        – est. {{ formatScheduleItemEstimate(result) }}
                        <template v-if="result.category">
                            – {{ result.category }}
                        </template>
                        <template v-if="result.system">
                            – {{ result.system }} {{ result.emulated ? '(Emulated)' : '' }}
                        </template>
                    </span>
                    <div
                        v-if="result.type === 'SPEEDRUN'"
                        class="title-additional-details"
                    >
                        <font-awesome-icon icon="gamepad" size="sm" fixed-width />
                        {{ talentStore.formatSpeedrunTeamList(result) }}
                    </div>
                    <div
                        v-else-if="result.talentIds.length > 0"
                        class="title-additional-details"
                    >
                        <font-awesome-icon icon="headset" size="sm" fixed-width />
                        {{ talentStore.formatTalentIdList(result.talentIds, 4) }}
                    </div>
                </template>
                <div>
                    <div
                        v-if="isOpen"
                        class="m-b-4"
                        :key="minutes"
                    >
                        <font-awesome-icon icon="clock" size="sm" fixed-width />
                        {{ formatScheduledStartTime(result.scheduledStartTime) }}
                    </div>
                    <div
                        v-if="result.firstGameplayTransitionTime != null"
                        class="m-b-4"
                    >
                        <font-awesome-icon icon="stopwatch" size="sm" fixed-width />
                        {{ formatScheduleTimeliness(result.scheduledStartTime, result.firstGameplayTransitionTime as string) }}
                    </div>
                    <div class="layout horizontal">
                        <ipl-button
                            v-if="result.type === 'SPEEDRUN'"
                            color="transparent"
                            inline
                            class="m-r-8"
                            :disabled="result.id === scheduleStore.activeSpeedrun?.id || timerStore.timerActive"
                            @click="setActiveSpeedrun(result.id)"
                        >
                            <font-awesome-icon icon="circle" size="sm" />
                            Set as active run
                        </ipl-button>
                        <ipl-button
                            color="transparent"
                            inline
                            class="m-r-8"
                            @click="editScheduleItem(result.id)"
                        >
                            <font-awesome-icon icon="pen-to-square" size="sm" />
                            Edit
                        </ipl-button>
                    </div>
                </div>
            </ipl-expanding-space>
        </ipl-space>
    </ipl-dialog>
</template>

<script setup lang="ts">
import {
    IplButton,
    IplCheckbox,
    IplDialog,
    IplExpandingSpace,
    IplInput,
    IplSpace
} from '@iplsplatoon/vue-components';
import { computed, inject, ref, watch } from 'vue';
import { formatScheduleItemEstimate } from 'client-shared/helpers/StringHelper';
import { isBlank } from 'shared/StringHelper';
import { useScheduleStore } from 'client-shared/stores/ScheduleStore';
import { library } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { useTalentStore } from 'client-shared/stores/TalentStore';
import {
    OtherScheduleItemWithTalentInfo,
    ScheduleItemWithTalentInfo,
    SpeedrunWithTalentInfo
} from 'types/ScheduleHelpers';
import { faHeadset } from '@fortawesome/free-solid-svg-icons/faHeadset';
import { faGamepad } from '@fortawesome/free-solid-svg-icons/faGamepad';
import { faCircle } from '@fortawesome/free-solid-svg-icons/faCircle';
import { faPenToSquare } from '@fortawesome/free-solid-svg-icons';
import { faClock } from '@fortawesome/free-solid-svg-icons/faClock';
import { faStopwatch } from '@fortawesome/free-solid-svg-icons/faStopwatch';
import { sendMessage } from 'client-shared/helpers/NodecgHelper';
import ScheduleItemTypeBadge from '../../components/ScheduleItemTypeBadge.vue';
import { ScheduleItemEditorInjectionKey } from '../../helpers/Injections';
import { useTimerStore } from 'client-shared/stores/TimerStore';
import { DateTime } from 'luxon';
import { useMinutes } from '../../helpers/useMinutes';
import { formatScheduledStartTime } from 'client-shared/helpers/StringHelper';

library.add(faGamepad, faHeadset, faCircle, faPenToSquare, faClock, faStopwatch);

type ScheduleItemWithIndexAndTalentInfo = ScheduleItemWithTalentInfo & { index: number };

const scheduleStore = useScheduleStore();
const talentStore = useTalentStore();
const timerStore = useTimerStore();

const isOpen = ref(false);
const query = ref('');
const searchByTalentName = ref(true);
const searchByTitle = ref(true);

const scheduleItemEditor = inject(ScheduleItemEditorInjectionKey);

const minutes = useMinutes();

watch(isOpen, newValue => {
    if (!newValue) {
        query.value = '';
    } else {
        minutes.value = DateTime.now().minute;
    }
});

function open() {
    isOpen.value = true;
}

function formatScheduleTimeliness(scheduledStartTime: string, firstGameplayTransitionTime: string): string {
    const parsedScheduledStartTime = DateTime.fromISO(scheduledStartTime);
    const parsedFirstGameplayTransitionTime = DateTime.fromISO(firstGameplayTransitionTime);
    const isAheadOfSchedule = parsedScheduledStartTime >= parsedFirstGameplayTransitionTime;
    const timeDiff = parsedFirstGameplayTransitionTime.set({ millisecond: 0 }).diff(parsedScheduledStartTime).rescale().mapUnits(x => Math.abs(Math.round(x)));
    const formattedDiff = timeDiff.toHuman({ unitDisplay: 'narrow' });

    return isAheadOfSchedule ? `Started ${formattedDiff} ahead of schedule` : `Started ${formattedDiff} behind schedule`;
}

const scheduleItemsWithTalentInfo = computed<ScheduleItemWithIndexAndTalentInfo[]>(() => {
    return scheduleStore.schedule.items.map((scheduleItem, i) => {
        if (scheduleItem.type === 'SPEEDRUN') {
            return {
                ...scheduleItem,
                commentators: scheduleItem.commentatorIds.map(commentatorId => talentStore.findTalentItemById(commentatorId.id)),
                teams: scheduleItem.teams.map(team => ({
                    ...team,
                    players: team.playerIds.map(playerId => talentStore.findTalentItemById(playerId.id))
                })),
                index: i
            } satisfies SpeedrunWithTalentInfo;
        } else {
            return {
                ...scheduleItem,
                talent: scheduleItem.talentIds.map(talentId => talentStore.findTalentItemById(talentId.id)),
                index: i
            } satisfies OtherScheduleItemWithTalentInfo;
        }
    });
});

const searchResults = computed(() => {
    if (isBlank(query.value)) {
        return scheduleItemsWithTalentInfo.value;
    }

    const normalizedQuery = query.value.toLowerCase();
    return scheduleItemsWithTalentInfo.value.filter(scheduleItem => {
        if (searchByTitle.value && scheduleItem.title.toLowerCase().includes(normalizedQuery)) return true;

        if (searchByTalentName.value) {
            if (scheduleItem.type === 'SPEEDRUN') {
                return scheduleItem.commentators.some(commentator => commentator != null && commentator.name.toLowerCase().includes(normalizedQuery))
                    || scheduleItem.teams.some(team => team.players.some(player => player != null && player.name.toLowerCase().includes(normalizedQuery)));
            } else {
                return scheduleItem.talent.some(talent => talent != null && talent.name.toLowerCase().includes(normalizedQuery));
            }
        }

        return false;
    });
});

async function setActiveSpeedrun(scheduleItemId: string) {
    await sendMessage('speedrun:setActiveSpeedrun', { scheduleItemId });
    isOpen.value = false;
}

function editScheduleItem(scheduleItemId: string) {
    scheduleItemEditor?.value?.open(scheduleItemId);
}

defineExpose({
    open
});
</script>

<style lang="scss" scoped>
.results-display {
    height: 75vh;
    overflow-y: auto;

    > *:not(:last-child) {
        margin-bottom: 8px;
    }
}

.title-additional-details {
    font-weight: 400;
    margin-top: 2px;
}

.item-index {
    font-weight: 400;
}
</style>
