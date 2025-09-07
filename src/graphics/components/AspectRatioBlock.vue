<template>
    <div
        ref="wrapper"
        class="aspect-ratio-box"
        :style="style"
    >
        <slot />
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

// This component is a brute-force solution to when using aspect-ratio in CSS inexplicably doesn't work.
const props = defineProps<{
    automaticAxis: 'width' | 'height' | 'smaller'
    aspectRatio: number
}>();

const wrapper = ref<HTMLDivElement>();
const elementSize = ref({ width: 0, height: 0 });
const resizeObserver = new ResizeObserver(entries => {
    const contentRect = entries[0].contentRect;
    elementSize.value = { width: contentRect.width, height: contentRect.height };
});
onMounted(() => {
    resizeObserver.observe(wrapper.value!);
    const contentRect = wrapper.value!.getBoundingClientRect();
    elementSize.value = { width: contentRect.width, height: contentRect.height };
});
onUnmounted(() => {
    resizeObserver.disconnect();
});
const style = computed(() => {
    const axis = props.automaticAxis === 'smaller'
        ? elementSize.value.height > elementSize.value.width ? elementSize.value.width : elementSize.value.height
        : props.automaticAxis;

    if (axis === 'width') {
        return {
            width: `${elementSize.value.height * props.aspectRatio}px`
        };
    } else {
        return {
            height: `${elementSize.value.width / props.aspectRatio}px`
        };
    }
});
</script>
