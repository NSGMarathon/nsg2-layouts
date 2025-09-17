<template>
    <ipl-space>
        <ipl-select
            v-for="player in activeRunPlayers"
            :options="playerOptions"
            :model-value="player.bingoPlayerId"
            :label="`Bingo player for ${player.talentName}`"
            class="m-b-4"
            @update:model-value="onBingoPlayerSelect(player.talentId, $event)"
        />
    </ipl-space>
</template>

<script setup lang="ts">
import { useBingoStore } from 'client-shared/stores/BingoStore';
import { useScheduleStore } from 'client-shared/stores/ScheduleStore';
import { useTalentStore } from 'client-shared/stores/TalentStore';
import { computed } from 'vue';
import { IplSelect, IplSpace } from '@iplsplatoon/vue-components';
import { SelectOptions } from '@iplsplatoon/vue-components/dist/types/select';
import cloneDeep from 'lodash/cloneDeep';

const bingoStore = useBingoStore();
const scheduleStore = useScheduleStore();
const talentStore = useTalentStore();

const playerOptions = computed<SelectOptions>(() => bingoStore.bingoState.players
    .filter(bingoPlayer => bingoPlayer.name !== nodecg.bundleName)
    .map(bingoPlayer => ({
        name: bingoPlayer.name,
        value: bingoPlayer.id
    })));

function onBingoPlayerSelect(talentId: string, bingoPlayerId: string) {
    const newTalentMapping = cloneDeep(bingoStore.bingoTalentMapping);
    const existingTalentIndex = newTalentMapping.findIndex(mappingItem => mappingItem.talentId === talentId);
    if (existingTalentIndex === -1) {
        newTalentMapping.push({
            talentId,
            bingoPlayerId
        });
    } else {
        newTalentMapping[existingTalentIndex].bingoPlayerId = bingoPlayerId;
    }
    bingoStore.setBingoTalentMapping(newTalentMapping);
}

const activeRunPlayers = computed(() => {
    const talentIds = new Set<string>();

    scheduleStore.activeSpeedrun?.teams.forEach(team => {
        team.playerIds.forEach(id => talentIds.add(id.id));
    });

    return Array.from(talentIds).map(talentId => ({
        talentId,
        talentName: talentStore.findTalentItemById(talentId)?.name ?? 'Unknown talent',
        bingoPlayerId: bingoStore.bingoTalentMapping.find(mappingItem => mappingItem.talentId === talentId)?.bingoPlayerId ?? null
    }));
});
</script>

<style scoped lang="scss">

</style>
