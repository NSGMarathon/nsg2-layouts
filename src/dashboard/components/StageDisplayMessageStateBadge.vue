<template>
    <ipl-badge
        v-if="stageDisplayStore.stageDisplayState.message.visible"
        :color="color"
    >
        Active!
    </ipl-badge>
</template>

<script setup lang="ts">
import { IplBadge } from '@iplsplatoon/vue-components';
import { useStageDisplayStore } from 'client-shared/stores/StageDisplayStore';
import { computed } from 'vue';

const stageDisplayStore = useStageDisplayStore();

const color = computed(() => {
    switch (stageDisplayStore.stageDisplayState.message.color) {
        case 'GRAY':
            return '#BBBBBB';
        case 'RED':
            return 'red';
        case 'YELLOW':
            return 'yellow';
    }
});
</script>

<style scoped lang="scss">

</style>
