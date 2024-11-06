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
                        {{ talentStore.formatSpeedrunTeamList(result.teams) }}
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
                    <div class="m-b-2" :key="minutes">
                        <font-awesome-icon icon="clock" size="sm" fixed-width />
                        {{ formatScheduledStartTime(result.scheduledStartTime) }}
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
import { computed, inject, onUnmounted, ref, watch } from 'vue';
import { formatScheduleItemEstimate } from 'client-shared/helpers/StringHelper';
import { isBlank } from 'shared/StringHelper';
import { useScheduleStore } from 'client-shared/stores/ScheduleStore';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faGamepad } from '@fortawesome/free-solid-svg-icons/faGamepad';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { useTalentStore } from 'client-shared/stores/TalentStore';
import { faHeadset } from '@fortawesome/free-solid-svg-icons/faHeadset';
import {
    OtherScheduleItemWithTalentInfo,
    ScheduleItemWithTalentInfo,
    SpeedrunWithTalentInfo
} from 'types/ScheduleHelpers';
import { faCircle } from '@fortawesome/free-solid-svg-icons/faCircle';
import { faPenToSquare } from '@fortawesome/free-solid-svg-icons';
import { faClock } from '@fortawesome/free-solid-svg-icons/faClock';
import { sendMessage } from 'client-shared/helpers/NodecgHelper';
import ScheduleItemTypeBadge from '../../components/ScheduleItemTypeBadge.vue';
import { ScheduleItemEditorInjectionKey } from '../../helpers/Injections';
import { useTimerStore } from 'client-shared/stores/TimerStore';
import { DateTime } from 'luxon';

library.add(faGamepad, faHeadset, faCircle, faPenToSquare, faClock);

type ScheduleItemWithIndexAndTalentInfo = ScheduleItemWithTalentInfo & { index: number };

const scheduleStore = useScheduleStore();
const talentStore = useTalentStore();
const timerStore = useTimerStore();

const isOpen = ref(false);
const query = ref('');
const searchByTalentName = ref(true);
const searchByTitle = ref(true);

const scheduleItemEditor = inject(ScheduleItemEditorInjectionKey);

const minutes = ref(0);
let minuteUpdateInterval: number | undefined = undefined;
onUnmounted(() => {
    window.clearInterval(minuteUpdateInterval);
});

watch(isOpen, newValue => {
    if (!newValue) {
        query.value = '';
        window.clearInterval(minuteUpdateInterval);
    } else {
        minutes.value = DateTime.now().minute;
        minuteUpdateInterval = window.setInterval(() => {
            minutes.value = DateTime.now().minute;
        }, 30 * 1000);
    }
});

function open() {
    isOpen.value = true;
}

function formatScheduledStartTime(scheduledStartTime: string): string {
    const parsedTime = DateTime.fromISO(scheduledStartTime);

    return `${parsedTime.setLocale('en-GB').toLocaleString(DateTime.DATETIME_SHORT)} (${parsedTime.toRelative({ unit: ['days', 'hours', 'minutes'] })})`;
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
