<template>
    <ipl-dialog
        v-model:is-open="isOpen"
        style="width: 700px"
    >
        <template #header>
            <ipl-dialog-title
                title="Edit nameplate assignments"
                @close="isOpen = false"
            />
        </template>
        <ipl-space
            color="secondary"
            class="layout vertical center-horizontal"
        >
            <ipl-radio
                :model-value="String(selectedFeedIndex)"
                label="Feed"
                :options="feedOptions"
                name="nameplate-dialog-feed"
                @update:model-value="selectedFeedIndex = Number($event)"
            />
        </ipl-space>
        <ipl-space
            color="secondary"
            class="m-t-8"
            style="min-height: 50vh; max-height: 50vh; overflow-y: auto"
        >
            <div class="layout horizontal center-horizontal">
                <ipl-checkbox
                    v-model="nameplateAssignments.doAutomaticAssignments"
                    label="Use automatic assignments"
                    style="max-width: 400px"
                />
            </div>
            <div
                class="nameplate-assignment-layout m-t-8"
                :class="{ disabled: nameplateAssignments.doAutomaticAssignments }"
            >
                <div v-for="(nameplate, i) in nameplateAssignments.assignments">
                    <div class="title">Nameplate #{{ i + 1 }}</div>
                    <draggable
                        :list="nameplate.players"
                        group="nameplate-assignments"
                        class="nameplate-assignment-draggable"
                        :item-key="getDraggableItemKey"
                        :disabled="nameplateAssignments.doAutomaticAssignments"
                    >
                        <template #item="{ element }">
                            <ipl-space class="player-item">
                                {{ formatTalentName(element) }}
                            </ipl-space>
                        </template>
                    </draggable>
                </div>
                <div>
                    <div class="title">Unassigned</div>
                    <draggable
                        :list="unassignedTalent"
                        group="nameplate-assignments"
                        class="nameplate-assignment-draggable"
                        :item-key="getDraggableItemKey"
                        :disabled="nameplateAssignments.doAutomaticAssignments"
                    >
                        <template #item="{ element }">
                            <ipl-space class="player-item">
                                {{ formatTalentName(element) }}
                            </ipl-space>
                        </template>
                    </draggable>
                </div>
            </div>
        </ipl-space>
        <template #footer>
            <div style="max-width: 200px; margin: 0 auto">
                <ipl-button
                    color="green"
                    label="Save"
                    async
                    @click="save"
                />
            </div>
        </template>
    </ipl-dialog>
</template>

<script setup lang="ts">
import { IplButton, IplCheckbox, IplDialog, IplDialogTitle, IplRadio, IplSpace } from '@iplsplatoon/vue-components';
import { computed, ref, watch } from 'vue';
import { PlayerNameplateAssignments } from 'types/schemas';
import { useScheduleStore } from 'client-shared/stores/ScheduleStore';
import cloneDeep from 'lodash/cloneDeep';
import { useTalentStore } from 'client-shared/stores/TalentStore';
import Draggable from 'vuedraggable';
import { sendMessage } from 'client-shared/helpers/NodecgHelper';
import { isBlank } from 'shared/StringHelper';

const scheduleStore = useScheduleStore();
const talentStore = useTalentStore();

const selectedFeedIndex = ref(0);
const feedOptions = [
    { name: 'Main Feed', value: '0' },
    { name: 'Feed 2', value: '1' },
    { name: 'Feed 3', value: '2' }
];

const nameplateAssignments = ref<PlayerNameplateAssignments[number]>({ doAutomaticAssignments: true, assignments: [] });
watch(selectedFeedIndex, newValue => {
    nameplateAssignments.value = cloneDeep(scheduleStore.playerNameplateAssignments[newValue]);
}, { immediate: true });

const unassignedTalent = computed(() => {
    const assignedTeamPlayerIds = new Map<string, string[]>();
    nameplateAssignments.value.assignments.forEach(assignment => {
        assignment.players.forEach(player => {
            if (!assignedTeamPlayerIds.has(player.teamId)) {
                assignedTeamPlayerIds.set(player.teamId, [player.talentId]);
            } else {
                assignedTeamPlayerIds.get(player.teamId)!.push(player.talentId);
            }
        });
    });

    const result: { teamId: string, talentId: string }[] = [];
    scheduleStore.activeSpeedrun?.teams.forEach(team => {
        const assignedPlayerIds = assignedTeamPlayerIds.get(team.id);
        if (assignedPlayerIds != null) {
            team.playerIds.forEach(player => {
                const playerIndex = assignedPlayerIds.indexOf(player.id);
                if (playerIndex === -1) {
                    result.push({ teamId: team.id, talentId: player.id });
                } else {
                    assignedPlayerIds.splice(playerIndex, 1);
                }
            });
        } else {
            team.playerIds.forEach(player => {
                result.push({ teamId: team.id, talentId: player.id });
            });
        }
    });

    return Array.from(result.values());
});

const isOpen = ref(false);
function open() {
    selectedFeedIndex.value = 0;
    nameplateAssignments.value = cloneDeep(scheduleStore.playerNameplateAssignments[0]);
    isOpen.value = true;
}

async function save() {
    await sendMessage('nameplate:setCustomAssignments', {
        feedIndex: selectedFeedIndex.value,
        doAutomaticAssignments: nameplateAssignments.value.doAutomaticAssignments,
        nameplatePlayerIds: nameplateAssignments.value.assignments.map(assignment => assignment.players)
    });
    isOpen.value = false;
}

function formatTalentName(talentItem: { talentId: string, teamId: string }) {
    const talentDetails = talentStore.findTalentItemById(talentItem.talentId);
    const talentName = talentDetails?.name ?? `Unknown talent ${talentItem.talentId}`;

    if ((scheduleStore.activeSpeedrun?.teams.length ?? 0) > 1) {
        const teamIndex = scheduleStore.activeSpeedrun?.teams.findIndex(team => team.id === talentItem.teamId);
        if (teamIndex != null && teamIndex !== -1) {
            const teamName = scheduleStore.activeSpeedrun?.teams[teamIndex].name;
            if (!isBlank(teamName)) {
                return `[${teamName}] ${talentName}`;
            } else {
                return `[Team ${teamIndex + 1}] ${talentName}`;
            }
        }
    }

    return talentName;
}

function getDraggableItemKey(item: { teamId: string, talentId: string }): string {
    return `${item.teamId}_${item.talentId}`;
}

defineExpose({
    open
});
</script>

<style lang="scss" scoped>
.no-items-message {
    display: none;
    margin-top: 8px;
}

.nameplate-assignment-draggable {
    min-height: 35px;
}

.nameplate-assignment-draggable:empty {
    background-color: var(--ipl-bg-primary);
    border-radius: 8px;
    text-align: center;

    &:before {
        content: 'No players';
        line-height: 35px;
        color: var(--ipl-input-color);
    }

    ~ .no-items-message {
        display: block;
    }
}

.nameplate-assignment-layout {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;

    .player-item:not(:first-child) {
        margin-top: 8px;
    }

    &.disabled .nameplate-assignment-draggable {
        opacity: 0.75;
    }

    &:not(.disabled) {
        .player-item {
            cursor: grab;

            &.sortable-chosen {
                cursor: grabbing;
            }
        }
    }
}
</style>
