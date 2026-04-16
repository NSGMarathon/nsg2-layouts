<template>
    <ipl-dialog
        v-model:is-open="isOpen"
        style="width: 400px"
    >
        <template #header>
            <ipl-dialog-title
                title="Edit teams"
                @close="isOpen = false"
            />
        </template>
        <b>Team A - {{ feudStore.feudTeamInfo.teamA.score }} point{{ feudStore.feudTeamInfo.teamA.score === 1 ? '' : 's' }}</b>
        <ipl-input
            v-model="teamAName"
            name="teamAName"
            label="Name"
            class="m-b-8"
        />
        <b>Team B - {{ feudStore.feudTeamInfo.teamB.score }} point{{ feudStore.feudTeamInfo.teamB.score === 1 ? '' : 's' }}</b>
        <ipl-input
            v-model="teamBName"
            name="teamBName"
            label="Name"
        />
        <template #footer>
            <div class="layout horizontal">
                <ipl-button
                    color="red"
                    label="Reset scores"
                    class="m-r-8"
                    async
                    requires-confirmation
                    @click="resetScores"
                />
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
import { IplButton, IplDialog, IplDialogTitle, IplInput } from '@iplsplatoon/vue-components';
import { ref } from 'vue';
import { useFeudStore } from 'client-shared/stores/FeudStore';
import { sendMessage } from 'client-shared/helpers/NodecgHelper';

const feudStore = useFeudStore();

const teamAName = ref('');
const teamBName = ref('');

function resetScores() {
    return sendMessage('feud:resetScores');
}

const isOpen = ref(false);
function open() {
    teamAName.value = feudStore.feudTeamInfo.teamA.name;
    teamBName.value = feudStore.feudTeamInfo.teamB.name;
    isOpen.value = true;
}

function onSave() {
    feudStore.setTeamNames(teamAName.value, teamBName.value);
    isOpen.value = false;
}

defineExpose({
    open,
});
</script>
