<template>
    <ipl-space>
        <ipl-message
            v-if="currentHost == null"
            type="info"
        >
            No host is currently assigned.
        </ipl-message>
        <div v-else>
            <div class="text-low-emphasis">Current host</div>
            <span class="host-name">{{ currentHost.name }}</span><ipl-badge v-if="currentHost.pronouns" class="m-l-4">{{ currentHost.pronouns }}</ipl-badge>
        </div>
        <div class="layout horizontal center-horizontal m-t-8">
            <ipl-button
                v-if="currentHost != null"
                class="m-r-8"
                label="Edit current"
                @click="editCurrentHost"
            />
            <ipl-button
                label="Set new host"
                color="green"
                @click="setNewHost"
            />
        </div>
        <div class="text-center m-t-8">
            <ipl-button
                inline
                label="Remove host"
                color="red"
                @click="removeCurrentHost"
            />
        </div>
    </ipl-space>
    <talent-select-dialog ref="talentSelectDialog" />
</template>

<script setup lang="ts">
import { IplBadge, IplButton, IplMessage, IplSpace } from '@iplsplatoon/vue-components';
import { useTalentStore } from 'client-shared/stores/TalentStore';
import { computed, inject, ref } from 'vue';
import TalentSelectDialog from '../../components/TalentSelectDialog.vue';
import { TalentItem } from 'types/ScheduleHelpers';
import { sendMessage } from 'client-shared/helpers/NodecgHelper';
import { TalentItemEditDialogInjectionKey } from '../../helpers/Injections';

const talentItemEditDialog = inject(TalentItemEditDialogInjectionKey);

const talentStore = useTalentStore();

const currentHost = computed(() => talentStore.findTalentItemById(talentStore.currentHostId));

const talentSelectDialog = ref<InstanceType<typeof TalentSelectDialog>>();

function setNewHost() {
    talentSelectDialog.value?.open(onTalentSelect);
}

async function onTalentSelect(talentItem: TalentItem) {
    await sendMessage('talent:setCurrentHost', talentItem);
}

function editCurrentHost() {
    if (!talentStore.currentHostId) return;
    talentItemEditDialog?.value?.openForExisting(onTalentSelect, talentStore.currentHostId);
}

async function removeCurrentHost() {
    await sendMessage('talent:removeCurrentHost');
}
</script>

<style scoped lang="scss">
.host-name {
    font-size: 1.5em;
    font-weight: 700;
}

.ipl-badge {
    transform: translateY(-2px);
}
</style>
