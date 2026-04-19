<template>
    <div
        class="feud-lower-third-team grow"
        :class="props.team === 'teamA' ? 'team-a' : 'team-b'"
    >
        <div class="bg-inset">
            <vfd-pixel-text
                :font-size="32"
                :text-content="teamData.name"
                :color="props.team === 'teamB' ? 'red' : 'teal'"
                class="team-name"
                reveal
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import VfdPixelText from 'components/VfdPixelText.vue';
import { FeudTeam } from 'types/feud';
import { computed } from 'vue';
import { useFeudStore } from 'client-shared/stores/FeudStore';

const props = defineProps<{
    team: FeudTeam;
}>();

const feudStore = useFeudStore();

const teamData = computed(() => feudStore.feudTeamInfo[props.team]);
</script>

<style scoped lang="scss">
@use '../../styles/colors';

.feud-lower-third-team {
    padding: 12px;

    &.team-a {
        background: colors.$timer-background;
    }

    &.team-b {
        background: linear-gradient(to bottom, #261515 0%, #211111 100%);
    }
}

.team-name {
    transform: translateY(-10%);
}
</style>
