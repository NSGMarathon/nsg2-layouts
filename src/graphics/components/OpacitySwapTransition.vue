<template>
    <transition
        name="opacity-swap"
        :mode="mode"
        @enter="enter"
        @leave="leave"
        @before-leave="beforeLeave"
        @before-enter="beforeEnter"
    >
        <slot />
    </transition>
</template>

<script lang="ts">
import { PropType, defineComponent } from 'vue';
import gsap from 'gsap';

export default defineComponent({
    name: 'OpacitySwapTransition',

    props: {
        mode: {
            type: String as PropType<'in-out' | 'out-in' | 'default'>,
            default: 'out-in'
        },
        enterDelay: {
            type: Number,
            default: 0
        }
    },

    setup(props) {
        return {
            beforeEnter: (elem: HTMLElement) => {
                gsap.set(elem, { opacity: 0 });
            },
            enter: (elem: HTMLElement, done: gsap.Callback) => {
                gsap.to(elem, { opacity: 1, onComplete: done, duration: 0.35, ease: 'none', delay: props.enterDelay });
            },
            beforeLeave: (elem: HTMLElement) => {
                if (props.mode === 'default') {
                    gsap.set(elem, { position: 'absolute' });
                }
            },
            leave: (elem: HTMLElement, done: gsap.Callback) => {
                gsap.to(elem, { opacity: 0, onComplete: done, duration: 0.35, ease: 'none' });
            }
        };
    }
});
</script>
