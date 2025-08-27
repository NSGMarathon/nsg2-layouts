<template>
    <ipl-dialog
        v-model:is-open="isOpen"
        style="width: 400px"
        anchor-y="start"
    >
        <template #header>
            <ipl-input
                v-model="query"
                name="query"
                theme="large"
                placeholder="Search for talent..."
                type="search"
                ref="queryInput"
            />
            <ipl-button
                label="Create new Talent"
                color="green"
                class="m-t-8"
                @click="onNewTalent"
            />
        </template>
        <div class="results-display">
            <ipl-space
                v-for="result in searchResults"
                :key="result.id"
                clickable
                color="secondary"
                @click="onTalentSelect(result)"
            >
                {{ result.name }}
                <ipl-badge v-if="!isBlank(result.pronouns)">{{ result.pronouns }}</ipl-badge>
            </ipl-space>
            <div
                v-if="searchResults.length === 0"
                class="text-low-emphasis text-center"
                style="padding: 8px 0"
            >
                No results found
            </div>
        </div>
    </ipl-dialog>
</template>

<script setup lang="ts">
import { IplBadge, IplButton, IplDialog, IplInput, IplSpace } from '@iplsplatoon/vue-components';
import { computed, inject, nextTick, ref, watch } from 'vue';
import { useTalentStore } from 'client-shared/stores/TalentStore';
import { isBlank } from 'shared/StringHelper';
import { Talent } from 'types/schemas';
import { TalentItemEditDialogInjectionKey } from '../helpers/Injections';

const talentStore = useTalentStore();

const talentItemEditDialog = inject(TalentItemEditDialogInjectionKey);
const queryInput = ref<InstanceType<typeof IplInput>>();
const query = ref('');
const isOpen = ref(false);
let selectCallback: ((talentItem: Talent[number]) => void) | null = null;

watch(isOpen, newValue => {
    if (!newValue) {
        selectCallback = null;
        query.value = '';
    }
});

const searchResults = computed(() => {
    if (isBlank(query.value)) {
        return talentStore.talent;
    }

    const normalizedQuery = query.value.toLowerCase();
    return talentStore.talent.filter(talentItem => talentItem.name.toLowerCase().includes(normalizedQuery));
});

function onNewTalent() {
    talentItemEditDialog?.value?.openForNew(talentItem => {
        selectCallback?.(talentItem);
    }, query.value);
}

function onTalentSelect(talentItem: Talent[number]) {
    selectCallback?.(talentItem);
    isOpen.value = false;
}

function open(onSelect: (talentItem: Talent[number]) => void) {
    selectCallback = onSelect;
    isOpen.value = true;
    nextTick(() => {
        queryInput.value?.focus();
    });
}

defineExpose({
    open
});
</script>

<style scoped lang="scss">
.results-display *:not(:last-child) {
    margin-bottom: 8px;
}
</style>
