<template>
    <div>
        <draggable
            :list="internalTalentList"
            item-key="teamPlayerId"
            handle=".talent-item-grip"
            group="talent-items"
            class="talent-list-editor"
            @change="onChange"
        >
            <template #item="{ element, index }">
                <ipl-expanding-space
                    class="talent-item-editor m-t-8"
                    color="secondary"
                >
                    <template #title>
                        {{ props.talentItemMap[element.talentId]?.name }}
                        <TalentListEditorRelayStatusBadge
                            :index="index"
                            :talent-id="element.talentId"
                            :team-active-relay-players="props.teamActiveRelayPlayers"
                        />
                    </template>
                    <template #header-extra>
                        <div class="layout horizontal center-vertical">
                            <ipl-button
                                small
                                icon="user-xmark"
                                color="red"
                                @click="onRemove(index)"
                            />
                            <font-awesome-icon
                                icon="grip-vertical"
                                class="talent-item-grip"
                            />
                        </div>
                    </template>
                    <talent-item-editor-form
                        v-if="props.talentItemMap[element.talentId] != null"
                        :model-value="props.talentItemMap[element.talentId]"
                    />
                </ipl-expanding-space>
            </template>
        </draggable>
    </div>
</template>

<script setup lang="ts">
import { Talent } from 'types/schemas';
import TalentItemEditorForm from './TalentItemEditorForm.vue';
import { ref, watch } from 'vue';
import Draggable from 'vuedraggable';
import { IplButton, IplExpandingSpace } from '@iplsplatoon/vue-components';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faGripVertical } from '@fortawesome/free-solid-svg-icons/faGripVertical';
import { faUserXmark } from '@fortawesome/free-solid-svg-icons/faUserXmark';
import TalentListEditorRelayStatusBadge from './TalentListEditorRelayStatusBadge.vue';

library.add(faGripVertical, faUserXmark);

const props = defineProps<{
    talentList: { id: string }[]
    talentItemMap: Record<string, Talent[number]>
    teamActiveRelayPlayers?: { talentId: string, index: number }[]
}>();

const emit = defineEmits<{
    'update:talentList': [newValue: { id: string }[]]
}>();

const internalTalentList = ref<{ talentId: string, teamPlayerId: string }[]>([]);
watch(() => props.talentList, newValue => {
    // Each member of this list needs a strictly unique ID, or else things will occasionally go wrong.
    // Talent may be added to a team multiple times, so this was cooked up as a workaround.
    internalTalentList.value = newValue.map((talentId, index) => ({ talentId: talentId.id, teamPlayerId: `${talentId.id}_${index}` }));
}, { immediate: true, deep: true });

function onRemove(talentIndex: number) {
    internalTalentList.value = internalTalentList.value.toSpliced(talentIndex, 1);
    onChange();
}

function onChange() {
    emit('update:talentList', internalTalentList.value.map(listItem => ({ id: listItem.talentId })));
}
</script>

<style lang="scss" scoped>
.talent-list-editor {
    &:empty:before {
        content: 'No items';
        color: var(--ipl-input-color);
        border-radius: 8px;
        display: block;
        text-align: center;
        line-height: 45px;
        background-color: var(--ipl-bg-secondary);
    }
}

.talent-item-grip {
    color: var(--ipl-input-color);
    cursor: grab;
    padding: 0 4px 0 12px;
    font-size: 1.25em;
}
</style>
