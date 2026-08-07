<template>
    <span class="contestant-indicator">
        <span
            class="color-indicator"
            :class="`contestant-${props.contestantIndex}`"
        >
            {{ props.contestantIndex + 1 }}</span>&nbsp;{{(jepStore.jepContestants[props.contestantIndex]?.name ?? '???')
        }}
    </span>
</template>

<script setup lang="ts">
import { useJepStore } from 'client-shared/stores/JepStore';

const props = defineProps<{
    contestantIndex: number
}>();

const jepStore = useJepStore();
</script>

<style scoped lang="scss">
.contestant-indicator {
    overflow-wrap: anywhere;
}

.color-indicator {
    border-radius: 999px;
    font-weight: 700;
    padding: 0 0.3em;
    text-align: center;

    &.contestant-0 {
        background-color: #E74E36;
        color: #fff;
    }

    &.contestant-1 {
        background-color: #36E74E;
        color: #000;
    }

    &.contestant-2 {
        background-color: #4E36E7;
        color: #fff;
    }
}
</style>
