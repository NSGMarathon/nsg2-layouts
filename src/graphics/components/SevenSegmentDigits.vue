<template>
    <div
        class="wrapper"
        :class="{
            flash: props.flash,
            [`color-${props.color}`]: isPresetColor,
            'custom-color': !isPresetColor
        }"
        :style="{
            '--custom-color': props.color
        }"
    >
        <span class="unlit">{{ unlitSegment ?? '8'.repeat(props.digitCount ?? 1) }}</span>
        <span class="digits">{{ props.padDigits && props.value != null ? String(props.value ?? '').padStart(props.digitCount ?? 1, '0') : props.value }}</span>
        <span v-if="props.alwaysLitSegment != null" class="always-lit-segment">{{ alwaysLitSegment }}</span>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
    digitCount?: number
    unlitSegment?: string
    alwaysLitSegment?: string
    value?: number | string | null
    padDigits?: boolean
    flash?: boolean
    color?: 'teal' | 'red' | string
}>(), {
    padDigits: false,
    flash: false,
    color: 'teal'
});

const isPresetColor = computed(() => props.color === 'teal' || props.color === 'red');
</script>

<style scoped lang="scss">
@use '../styles/colors';

.wrapper {
    font-family: 'DSEG7 Classic';
    position: relative;
    text-rendering: geometricPrecision;
    font-weight: 700;

    &.flash > .digits {
        animation: digits-flash 2s 3;
    }

    &.custom-color {
        .digits, .always-lit-segment {
            color: hsl(from var(--custom-color) h calc(s + 10) calc(l + 5));
        }

        .unlit {
            color: hsl(from var(--custom-color) h calc(s - 15) calc(l - 40));
        }
    }

    &.color-teal {
        .digits, .always-lit-segment {
            color: colors.$vfd-teal;
        }

        .unlit {
            color: colors.$vfd-teal-unlit;
        }
    }

    &.color-red {
        .digits, .always-lit-segment {
            color: colors.$vfd-red;
        }

        .unlit {
            color: colors.$vfd-red-unlit;
        }
    }
}

.digits, .always-lit-segment {
    position: absolute;
    right: 0;
}

@keyframes digits-flash {
    0% {
        opacity: 1;
    }

    48% {
        opacity: 1;
    }

    50% {
        opacity: 0;
    }

    98% {
        opacity: 0;
    }

    100% {
        opacity: 1;
    }
}
</style>
