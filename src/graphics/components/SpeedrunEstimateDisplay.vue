<template>
    <div class="speedrun-estimate-display">
        <div class="estimate-label">EST.</div>
        <seven-segment-digits
            :digit-count="2"
            :value="parsedEstimate?.hours === 0 ? null : parsedEstimate?.hours"
            class="estimate-digits m-l-4"
        />
        <div
            class="estimate-digit-label"
            :class="{ unlit: parsedEstimate?.hours === 0 }"
        >
            H
        </div>
        <seven-segment-digits
            :digit-count="2"
            :value="Math.round(parsedEstimate?.minutes ?? 0)"
            pad-digits
            class="estimate-digits"
        />
        <div class="estimate-digit-label">M</div>
    </div>
</template>

<script setup lang="ts">
import SevenSegmentDigits from 'components/SevenSegmentDigits.vue';
import { computed } from 'vue';
import { Duration } from 'luxon';

const props = defineProps<{
    estimate?: string
}>();

const parsedEstimate = computed(() =>
    props.estimate == null
        ? { minutes: 0, hours: 0 }
        : Duration.fromISO(props.estimate).shiftTo('minutes', 'hours').toObject());
</script>

<style scoped lang="scss">
@use '../styles/colors';

.speedrun-estimate-display {
    display: flex;
    align-items: flex-end;
}

.estimate-digits {
    font-size: 2em;
}

.estimate-label {
    color: colors.$vfd-red;
}

.estimate-digit-label {
    color: colors.$vfd-teal;

    &.unlit {
        color: colors.$vfd-teal-unlit;
    }
}

.estimate-label, .estimate-digit-label {
    font-weight: 700;
    font-size: 1.2em;
    margin-bottom: -3px;
}
</style>
