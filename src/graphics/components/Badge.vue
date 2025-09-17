<template>
    <span
        class="badge"
        :style="{
            backgroundColor: props.color,
            color: props.color == null ? undefined : getContrastingTextColor(props.color, '#fff', '#000')
        }"
    >
        <slot />
    </span>
</template>

<script setup lang="ts">
import { getContrastingTextColor } from '@iplsplatoon/vue-components';

const props = defineProps<{
    color?: string
}>();
</script>

<style scoped lang="scss">
@use '../styles/colors';

.badge {
    background-color: colors.$vfd-teal;
    color: #000;
    padding: 1px 4px;
    font-size: 0.7em;
    display: inline-block;
    font-family: 'Roboto Condensed', 'Noto Sans JP', sans-serif;
    font-weight: 500;
}
</style>
