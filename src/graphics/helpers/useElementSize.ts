import { onMounted, onUnmounted, ref, Ref, watch, WatchSource } from 'vue';

export function useElementSize(element: WatchSource<Element | null | undefined>): Ref<{ height: number, width: number }> {
    const result = ref({ height: 0, width: 0 });
    const observer = new ResizeObserver(entries => {
        result.value = {
            width: entries[0].borderBoxSize[0].inlineSize,
            height: entries[0].borderBoxSize[0].blockSize
        };
    });

    onMounted(() => {
        watch(element, (newValue, oldValue) => {
            if (oldValue != null) {
                observer.unobserve(oldValue);
            }
            if (newValue != null) {
                observer.observe(newValue);
            }
        }, { immediate: true });
    });

    onUnmounted(() => {
        observer.disconnect();
    });

    return result;
}
