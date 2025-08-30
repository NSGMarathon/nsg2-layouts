<template>
    <form @submit.prevent>
        <ipl-dialog
            v-model:is-open="isOpen"
            style="width: 600px"
        >
            <template #header>
                <ipl-message
                    v-if="saveError"
                    type="error"
                    class="m-b-8"
                    closeable
                    @close="saveError = null"
                >
                    {{ saveError }}
                </ipl-message>
                <ipl-dialog-title
                    title="Edit schedule item"
                    color="secondary"
                    @close="isOpen = false"
                />
            </template>
            <ipl-message
                v-if="selectedScheduleItem == null"
                type="warning"
            >
                The selected item could not be found in the schedule.
            </ipl-message>
            <template v-else>
                <ipl-space color="secondary">
                    <ipl-input
                        v-model="selectedScheduleItem.title"
                        name="title"
                        label="Title"
                    />
                    <template v-if="selectedScheduleItem.type === 'SPEEDRUN'">
                        <div
                            class="layout horizontal m-t-4"
                            style="align-items: flex-end"
                        >
                            <twitch-category-select
                                v-model="selectedScheduleItem.twitchCategory"
                                color="primary"
                                :schedule-item-title="selectedScheduleItem.title"
                                class="max-width"
                                @update:release-year="selectedScheduleItem.releaseYear = $event"
                            />
                            <ipl-input
                                v-model="selectedScheduleItem.releaseYear"
                                name="releaseYear"
                                label="Release year"
                                class="m-l-8"
                                style="width: 50%"
                            />
                        </div>
                        <div class="layout horizontal m-t-4">
                            <ipl-input
                                v-model="selectedScheduleItem.category"
                                name="category"
                                label="Category"
                                class="max-width"
                            />
                            <ipl-input
                                v-model="selectedScheduleItem.system"
                                name="system"
                                label="System"
                                class="m-l-8 max-width"
                            />
                        </div>
                    </template>
                    <template v-else>
                        <ipl-input
                            v-model="selectedScheduleItem.description"
                            name="description"
                            label="Description"
                            class="m-t-4"
                        />
                        <twitch-category-select
                            v-model="selectedScheduleItem.twitchCategory"
                            :schedule-item-title="selectedScheduleItem.title"
                            color="primary"
                            class="max-width m-t-2"
                        />
                    </template>
                    <div class="layout horizontal center-horizontal">
                        <duration-input
                            v-model="selectedScheduleItem.estimate"
                            label="Estimate"
                            style="width: 35%"
                        />
                        <duration-input
                            v-model="selectedScheduleItem.setupTime"
                            label="Setup time"
                            class="m-l-8"
                            style="width: 35%"
                        />
                        <ipl-select
                            v-if="selectedScheduleItem.type === 'SPEEDRUN'"
                            v-model="selectedScheduleItem.layout as string | null"
                            :options="layoutOptions as Option[]"
                            class="m-l-8 max-width"
                            label="Layout"
                        />
                    </div>
                    <template v-if="selectedScheduleItem.type === 'SPEEDRUN'">
                        <div class="layout horizontal center-horizontal m-t-8">
                            <ipl-checkbox
                                v-model="isRelay"
                                label="Relay"
                            />
                            <ipl-checkbox
                                v-model="isEmulated"
                                label="Emulated"
                                class="m-l-8"
                            />
                        </div>
                    </template>
                </ipl-space>
                <template v-if="selectedScheduleItem.type === 'SPEEDRUN'">
                    <ipl-space
                        color="secondary"
                        class="m-t-8"
                    >
                        <video-file-select
                            :model-value="selectedScheduleItem.videoFile"
                            color="primary"
                            class="max-width"
                            @update:model-value="onVideoFileSelect"
                        />
                        <div
                            v-if="selectedScheduleItem.videoFile != null"
                            class="layout horizontal center-horizontal m-t-4"
                        >
                            <duration-input
                                v-model="selectedScheduleItem.videoFile.timerStartTime"
                                label="Timer starts at"
                                style="max-width: 150px"
                            />
                            <duration-input
                                v-model="selectedScheduleItem.videoFile.timerStopTime"
                                class="m-l-8"
                                label="Timer stops at"
                                style="max-width: 150px"
                            />
                        </div>
                    </ipl-space>
                    <div class="m-t-8">
                        <ipl-space
                            color="secondary"
                            class="layout horizontal center-vertical m-b-8"
                        >
                            <div class="max-width">Teams</div>
                            <ipl-button
                                icon="plus"
                                small
                                color="green"
                                @click="addTeam"
                            />
                        </ipl-space>
                        <div
                            v-for="(team, index) in selectedScheduleItem.teams"
                            :key="team.id"
                            class="m-b-8"
                        >
                            <ipl-space
                                color="secondary"
                                class="layout horizontal center-vertical m-b-8 m-l-16"
                            >
                                <ipl-input
                                    v-model="team.name"
                                    :placeholder="team.playerIds.length === 0 ? 'Empty team' : 'Team ' + talentStore.formatTalentIdList(team.playerIds, 4)"
                                    name="team-name"
                                    label="Name"
                                    class="max-width"
                                />
                                <ipl-button
                                    icon="user-plus"
                                    small
                                    color="green"
                                    class="m-l-8"
                                    @click="addTalentForTeam(team.id, $event)"
                                />
                                <ipl-button
                                    icon="xmark"
                                    small
                                    color="red"
                                    class="m-l-8"
                                    :disabled="selectedScheduleItem.teams.length <= 1"
                                    @click="removeTeam(index)"
                                />
                            </ipl-space>
                            <talent-list-editor
                                v-model:talent-list="team.playerIds"
                                :talent-item-map="talentItemMap"
                                color="secondary"
                                class="m-l-32"
                                :team-active-relay-players="activeRelayPlayerIndexMap?.[team.id]"
                            />
                        </div>
                    </div>
                    <div class="m-t-32">
                        <ipl-space
                            class="layout horizontal center-vertical"
                            color="secondary"
                        >
                            <div class="max-width">Commentators</div>
                            <ipl-button
                                icon="user-plus"
                                small
                                color="green"
                                @click="addTalent('commentators', $event)"
                            />
                        </ipl-space>
                        <talent-list-editor
                            v-model:talent-list="selectedScheduleItem.commentatorIds"
                            :talent-item-map="talentItemMap"
                            color="secondary"
                            class="m-l-16 m-t-8"
                        />
                    </div>
                </template>
                <div
                    v-else
                    class="m-t-8"
                >
                    <ipl-space
                        color="secondary"
                        class="layout horizontal center-vertical"
                    >
                        <div class="max-width">Talent</div>
                        <ipl-button
                            icon="user-plus"
                            small
                            color="green"
                            @click="addTalent('talent', $event)"
                        />
                    </ipl-space>
                    <talent-list-editor
                        v-model:talent-list="selectedScheduleItem.talentIds"
                        :talent-item-map="talentItemMap"
                        color="secondary"
                        class="m-l-16 m-t-8"
                    />
                </div>
            </template>
            <template #footer>
                <div style="max-width: 200px; margin: 0 auto">
                    <ipl-button
                        label="Save"
                        color="green"
                        type="submit"
                        @click="onSave"
                    />
                </div>
            </template>
        </ipl-dialog>
    </form>
    <talent-select-dialog
        ref="talentSelectPopup"
        :style="floatingStyles"
    />
</template>

<script setup lang="ts">
import {
    IplButton,
    IplCheckbox,
    IplDialog,
    IplDialogTitle,
    IplInput,
    IplMessage,
    IplSelect,
    IplSpace
} from '@iplsplatoon/vue-components';
import { computed, ref, watch } from 'vue';
import { ScheduleItem } from 'types/ScheduleHelpers';
import { useScheduleStore } from 'client-shared/stores/ScheduleStore';
import cloneDeep from 'lodash/cloneDeep';
import DurationInput from './DurationInput.vue';
import TalentListEditor from './TalentListEditor.vue';
import { ActiveRelayPlayers, OtherScheduleItem, Speedrun, Talent, VideoFile } from 'types/schemas';
import { useTalentStore } from 'client-shared/stores/TalentStore';
import { sendMessage } from 'client-shared/helpers/NodecgHelper';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faUserPlus } from '@fortawesome/free-solid-svg-icons/faUserPlus';
import { faPlus } from '@fortawesome/free-solid-svg-icons/faPlus';
import { faXmark } from '@fortawesome/free-solid-svg-icons/faXmark';
import TwitchCategorySelect from './TwitchCategorySelect.vue';
import { layouts } from 'types/Layouts';
import { v4 as uuidV4 } from 'uuid';
import VideoFileSelect from './VideoFileSelect.vue';
import { Duration } from 'luxon';
import { Option } from '@iplsplatoon/vue-components/dist/types/select';
import TalentSelectDialog from './TalentSelectDialog.vue';
import { offset, shift, useFloating } from '@floating-ui/vue';

library.add(faUserPlus, faPlus, faXmark);

const scheduleStore = useScheduleStore();
const talentStore = useTalentStore();

const isOpen = ref(false);
const selectedScheduleItem = ref<ScheduleItem | null>(null);
const talentItemMap = ref<Record<string, Talent[number]>>({});

const addingTalentFor = ref<['team' | 'commentators' | 'talent', string | null] | null>(null);
const talentSelectPopup = ref<InstanceType<typeof TalentSelectDialog>>();
const talentSelectTargetElem = ref<HTMLElement | null>(null);
const { floatingStyles } = useFloating(talentSelectTargetElem, talentSelectPopup, {
    placement: 'right-end',
    middleware: [
        offset(8),
        shift({
            crossAxis: true,
            mainAxis: true,
            padding: 8
        })
    ]
});

watch(isOpen, newValue => {
    if (!newValue) {
        addingTalentFor.value = null;
        talentSelectTargetElem.value = null;
    }
});

const editingActiveSpeedrun = computed(() => selectedScheduleItem.value?.type === 'SPEEDRUN' && selectedScheduleItem.value?.id === scheduleStore.activeSpeedrun?.id);

const activeRelayPlayerIndexMap = computed(() => {
    if (!editingActiveSpeedrun.value) return null;

    return scheduleStore.activeRelayPlayers.reduce((result, activeTeamPlayers) => {
        result[activeTeamPlayers.teamId] = activeTeamPlayers.players;
        return result;
    }, {} as Record<string, ActiveRelayPlayers[number]['players']>);
});

const isRelay = computed({
    get() {
        return selectedScheduleItem.value?.type === 'SPEEDRUN' ? (selectedScheduleItem.value.relay ?? undefined) : undefined;
    },
    set(newValue: boolean) {
        if (selectedScheduleItem.value?.type === 'SPEEDRUN') {
            selectedScheduleItem.value.relay = newValue;
        }
    }
});
const isEmulated = computed({
    get() {
        return selectedScheduleItem.value?.type === 'SPEEDRUN' ? (selectedScheduleItem.value.emulated ?? undefined) : undefined;
    },
    set(newValue: boolean) {
        if (selectedScheduleItem.value?.type === 'SPEEDRUN') {
            selectedScheduleItem.value.emulated = newValue;
        }
    }
});

const saveError = ref<string | null>(null);
async function onSave() {
    if (selectedScheduleItem.value == null) return;
    try {
        // Talent removed from the schedule item may still be present in the talent map; This will remove them
        await sendMessage('talent:updateTalentItems', Object.values(talentItemMap.value).filter(talentItem => {
            if (selectedScheduleItem.value!.type === 'SPEEDRUN') {
                return selectedScheduleItem.value!.commentatorIds.some(commentatorId => talentItem.id === commentatorId.id)
                    || selectedScheduleItem.value!.teams.some(team => team.playerIds.some(playerId => talentItem.id === playerId.id));
            } else {
                return selectedScheduleItem.value!.talentIds.some(talentId => talentItem.id === talentId.id);
            }
        }));
        await sendMessage('schedule:updateItem', selectedScheduleItem.value!);
        isOpen.value = false;
    } catch (e) {
        saveError.value = 'message' in e ? e.message : String(e);
    }
}

function addTalentForTeam(teamId: string, event: MouseEvent) {
    talentSelectPopup.value?.open(talentItem => {
        if (talentItemMap.value[talentItem.id] == null) {
            talentItemMap.value[talentItem.id] = talentItem;
        }
        (selectedScheduleItem.value as Speedrun).teams.find(team => team.id === teamId)?.playerIds.push({ id: talentItem.id, externalId: talentItem.externalId });
    });
    talentSelectTargetElem.value = event.target as HTMLElement;
}
function addTalent(destination: 'commentators' | 'talent', event: MouseEvent) {
    talentSelectPopup.value?.open(talentItem => {
        if (talentItemMap.value[talentItem.id] == null) {
            talentItemMap.value[talentItem.id] = talentItem;
        }
        if (destination === 'commentators') {
            (selectedScheduleItem.value as Speedrun).commentatorIds.push({ id: talentItem.id, externalId: talentItem.externalId });
        } else {
            (selectedScheduleItem.value as OtherScheduleItem).talentIds.push({ id: talentItem.id, externalId: talentItem.externalId });
        }
    });
    console.log('?', event.target);
    talentSelectTargetElem.value = event.target as HTMLElement;
}
function addTeam() {
    if (selectedScheduleItem.value?.type !== 'SPEEDRUN') return;

    selectedScheduleItem.value.teams.push({
        id: uuidV4(),
        name: '',
        playerIds: []
    });
}
function removeTeam(index: number) {
    if (selectedScheduleItem.value?.type !== 'SPEEDRUN') return;

    selectedScheduleItem.value.teams = selectedScheduleItem.value.teams.toSpliced(index, 1);
}

const layoutOptions = computed(() => [
    { name: 'None', value: null },
    ...Object.entries(layouts).map(([key, layout]) => ({ name: layout.name, value: key }))
]);

function open(scheduleItemId: string) {
    const scheduleItem = scheduleStore.schedule.items.find(scheduleItem => scheduleItem.id === scheduleItemId);
    selectScheduleItem(scheduleItem ?? null);
}
function openForActiveSpeedrun() {
    selectScheduleItem(scheduleStore.activeSpeedrun);
}
function openForNextSpeedrun() {
    selectScheduleItem(scheduleStore.nextSpeedrun);
}

function selectScheduleItem(scheduleItem: ScheduleItem | null) {
    if (scheduleItem == null) {
        talentItemMap.value = {};
        selectedScheduleItem.value = null;
    } else {
        const talentIdSet = new Set<string>();
        if (scheduleItem.type === 'SPEEDRUN') {
            scheduleItem.commentatorIds.forEach(commentatorId => {
                talentIdSet.add(commentatorId.id);
            });
            scheduleItem.teams.forEach(team => {
                team.playerIds.forEach(playerId => {
                    talentIdSet.add(playerId.id);
                });
            });
        } else {
            scheduleItem.talentIds.forEach(talentId => {
                talentIdSet.add(talentId.id);
            });
        }
        talentItemMap.value = Array.from(talentIdSet.values()).reduce((result, talentId) => {
            const talentItem = talentStore.findTalentItemById(talentId);
            if (talentItem != null) {
                result[talentId] = cloneDeep(talentItem);
            }
            return result;
        }, {} as Record<string, Talent[number]>);

        selectedScheduleItem.value = cloneDeep(scheduleItem);
    }
    isOpen.value = true;
}

function onVideoFileSelect(videoFile: VideoFile | null | undefined) {
    if (selectedScheduleItem.value?.type === 'SPEEDRUN') {
        if (videoFile == null) {
            selectedScheduleItem.value.videoFile = null;
        } else {
            const emptyDuration = Duration.fromObject({ seconds: 0, minutes: 0, hours: 0 }).toISO();
            selectedScheduleItem.value.videoFile = {
                ...videoFile,
                timerStartTime: emptyDuration,
                timerStopTime: emptyDuration
            };
        }
    }
}

defineExpose({
    open,
    openForActiveSpeedrun,
    openForNextSpeedrun
});
</script>
