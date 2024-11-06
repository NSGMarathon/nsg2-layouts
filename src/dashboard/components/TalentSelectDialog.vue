<template>
    <ipl-dialog
        :is-open="props.isOpen"
        @update:is-open="emit('update:isOpen', $event)"
        style="width: 400px"
    >
        <ipl-space color="secondary">
            <ipl-input
                v-model="query"
                name="query"
                theme="large"
                placeholder="Search for talent..."
                type="search"
            />
        </ipl-space>
        <ipl-space
            color="secondary"
            class="m-t-8"
        >
            <ipl-button
                label="Create new Talent"
                color="green"
                @click="onNewTalent"
            />
        </ipl-space>
        <ipl-space
            color="secondary"
            class="m-t-8 results-display"
        >
            <ipl-space
                v-for="result in searchResults"
                :key="result.id"
                clickable
                @click="emit('select', result)"
            >
                {{ result.name }}
                <ipl-badge v-if="!isBlank(result.pronouns)">{{ result.pronouns }}</ipl-badge>
            </ipl-space>
        </ipl-space>
    </ipl-dialog>
</template>

<script setup lang="ts">
import { IplBadge, IplButton, IplDialog, IplInput, IplSpace } from '@iplsplatoon/vue-components';
import { computed, inject, ref, watch } from 'vue';
import { useTalentStore } from 'client-shared/stores/TalentStore';
import { isBlank } from 'shared/StringHelper';
import { Talent } from 'types/schemas';
import { TalentItemEditDialogInjectionKey } from '../helpers/Injections';

const talentStore = useTalentStore();

const talentItemEditDialog = inject(TalentItemEditDialogInjectionKey);

const props = defineProps<{
    isOpen: boolean
}>();

const emit = defineEmits<{
    'update:isOpen': [newValue: boolean],
    'select': [talentItem: Talent[number]]
}>();

const query = ref('');

watch(() => props.isOpen, newValue => {
    if (!newValue) {
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
        emit('select', talentItem);
    }, query.value);
}
</script>

<style scoped lang="scss">
.results-display {
    height: 75vh;
    overflow-y: auto;

    > *:not(:last-child) {
        margin-bottom: 8px;
    }
}
</style>
