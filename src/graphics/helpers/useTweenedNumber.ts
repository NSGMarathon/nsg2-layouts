import { MaybeRefOrGetter, ref, Ref, toValue, watch } from 'vue';
import gsap from 'gsap';

export function useTweenedNumber(number: MaybeRefOrGetter<number>): Ref<number> {
    const tweenedNumber = ref(toValue(number));

    watch(() => toValue(number), newValue => {
        gsap.to(tweenedNumber, { duration: 0.5, value: newValue, roundProps: { value: 1 }, ease: 'expo.out' });
    });

    return tweenedNumber;
}
