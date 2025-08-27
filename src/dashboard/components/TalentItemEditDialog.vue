<template>
    <ipl-dialog
        :is-open="isOpen"
        style="width: 500px"
        @update:is-open="isOpen = $event"
    >
        <template #header>
            <ipl-dialog-title
                title="Edit talent"
                @close="isOpen = $event"
            />
        </template>
        <ipl-space color="secondary">
            <ipl-message
                v-if="talentItem == null"
                type="warning"
            >
                The specified talent item couldn't be found.
            </ipl-message>
            <template v-else>
                <talent-item-editor-form
                    v-model="talentItem"
                    ref="editorForm"
                />
            </template>
        </ipl-space>
        <template #footer>
            <div style="max-width: 200px; margin: 0 auto">
                <ipl-button
                    color="green"
                    label="Save"
                    @click="onSave"
                />
            </div>
        </template>
    </ipl-dialog>
</template>

<script setup lang="ts">
import { IplButton, IplDialog, IplDialogTitle, IplMessage, IplSpace } from '@iplsplatoon/vue-components';
import TalentItemEditorForm from './TalentItemEditorForm.vue';
import { nextTick, ref, watch } from 'vue';
import { v4 as uuidV4 } from 'uuid';
import { useTalentStore } from 'client-shared/stores/TalentStore';
import cloneDeep from 'lodash/cloneDeep';
import { TalentItem } from 'types/ScheduleHelpers';

const talentStore = useTalentStore();

const isOpen = ref(false);
const talentItem = ref<TalentItem | null>(null);
const editorForm = ref<InstanceType<typeof TalentItemEditorForm>>();
let selectCallback: ((talentItem: TalentItem) => void) | null = null;

watch(isOpen, newValue => {
    if (!newValue) {
        selectCallback = null;
    }
});

function openForNew(cb: (talentItem: TalentItem) => void, name: string | undefined | null) {
    talentItem.value = {
        id: uuidV4(),
        name: name ?? '',
        socials: {}
    };
    isOpen.value = true;
    selectCallback = cb;
    nextTick(() => {
        editorForm.value?.focus();
    });
}

function openForExisting(cb: (talentItem: TalentItem) => void, talentItemId: string) {
    talentItem.value = cloneDeep(talentStore.findTalentItemById(talentItemId) ?? null);
    selectCallback = cb;
    isOpen.value = true;
    nextTick(() => {
        editorForm.value?.focus();
    });
}

function onSave() {
    if (talentItem.value != null) {
        selectCallback?.(talentItem.value);
    }
    isOpen.value = false;
}

defineExpose({
    openForNew,
    openForExisting
});
</script>
