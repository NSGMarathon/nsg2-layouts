<template>
    <ipl-badge
        v-if="activeRelayPlayerForIndex != null"
        :color="activeRelayPlayerForIndex?.talentId === props.talentId ? 'blue' : 'yellow'"
    >
        {{ activeRelayPlayerForIndex?.talentId === props.talentId ? 'Active in relay' : 'New active relay player' }}
    </ipl-badge>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { IplBadge } from '@iplsplatoon/vue-components';

const props = defineProps<{
    index: number
    talentId: string
    teamActiveRelayPlayers?: { talentId: string, index: number }[]
}>();

const activeRelayPlayerForIndex = computed(() => props.teamActiveRelayPlayers == null
    ? null
    : props.teamActiveRelayPlayers.find(activeRelayPlayer => activeRelayPlayer.index === props.index));
</script>
