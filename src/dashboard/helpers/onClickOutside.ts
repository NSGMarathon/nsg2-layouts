import { ComponentPublicInstance, MaybeRefOrGetter, onMounted, onUnmounted, toValue } from 'vue';

type ReferencedElement = HTMLElement | ComponentPublicInstance;

function toElement(element: ReferencedElement | null | undefined): HTMLElement | null | undefined {
    if (element != null && '$el' in element) {
        return element.$el as HTMLElement;
    } else {
        return element;
    }
}

export function onClickOutside(element: MaybeRefOrGetter<ReferencedElement | null | undefined>, cb: () => void) {
    const clickListener = (event: MouseEvent) => {
        if (!toElement(toValue(element))?.contains(event.target as Node)) {
            cb();
        }
    }

    onMounted(() => {
        document.addEventListener('click', clickListener);
    });

    onUnmounted(() => {
        document.removeEventListener('click', clickListener);
    });
}
