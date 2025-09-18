<template>
    <div class="speedrun-estimate-display">
        <div class="estimate-label">EST.</div>
        <seven-segment-digits
            :digit-count="2"
            :value="parsedEstimate.hours === 0 ? null : parsedEstimate.hours"
            class="estimate-digits m-l-4"
        />
        <div
            class="estimate-digit-label"
            :class="{ unlit: parsedEstimate.hours === 0 }"
        >
            H
        </div>
        <seven-segment-digits
            :digit-count="2"
            :value="parsedEstimate.hours === 0 && parsedEstimate.minutes === 0 ? null : Math.round(parsedEstimate.minutes ?? 0)"
            pad-digits
            class="estimate-digits"
        />
        <div
            class="estimate-digit-label"
            :class="{ unlit: parsedEstimate.hours === 0 && parsedEstimate.minutes === 0 }"
        >
            M
        </div>
    </div>
</template>

<script setup lang="ts">
import SevenSegmentDigits from 'components/SevenSegmentDigits.vue';
import { computed } from 'vue';
import { Duration } from 'luxon';
import { Speedrun } from 'types/schemas';
import { toMetricTime } from 'shared/TimeHelper';

const props = withDefaults(defineProps<{
    estimate?: string
    setupTime?: string | null
    timerMode?: Speedrun['timerMode']
}>(), {
    timerMode: 'TIMER_COUNTUP'
});

const asDurationWithLength = (value: string | null | undefined) => {
    if (value == null) {
        return null;
    }

    const parsedDuration = Duration.fromISO(value);

    if (parsedDuration.as('seconds') > 0) {
        return parsedDuration.shiftTo('minutes', 'hours').toObject();
    } else {
        return null;
    }
};

const parsedEstimate = computed(() => {
    const durationObject = asDurationWithLength(props.estimate)
        ?? asDurationWithLength(props.setupTime)
        ?? { minutes: 0, hours: 0 };

    if (props.timerMode.includes('METRIC')) {
        const inMetricTime = toMetricTime({
            hours: 0,
            minutes: 0,
            seconds: 0,
            milliseconds: 0,
            ...durationObject
        });
        return {
            hours: inMetricTime.hours,
            minutes: Math.round(inMetricTime.minutes + inMetricTime.seconds / 100)
        };
    }

    return durationObject;
});
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
