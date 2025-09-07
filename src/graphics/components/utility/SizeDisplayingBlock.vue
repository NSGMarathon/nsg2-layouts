<template>
    <div
        class="size-displaying-block"
        ref="element"
    >
        <div class="text-content">
            <div class="label">
                <slot name="label" />
            </div>
            <div class="feed-size">{{ Math.round(elementSize.width) }} x {{ Math.round(elementSize.height) }}</div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useElementSize } from '../../helpers/useElementSize';

const element = ref<HTMLElement>();
const elementSize = useElementSize(element);
</script>

<style scoped lang="scss">
.size-displaying-block {
    border: 10px solid red;
    text-align: center;
    position: relative;

    > .text-content {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-variant-numeric: tabular-nums;
        width: 100%;

        > .label {
            font-size: 2em;
            font-weight: 500;
        }

        > .feed-size {
            font-size: 4em;
            font-weight: 700;
        }
    }
}
</style>
