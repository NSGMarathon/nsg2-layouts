<template>
    <div class="layout horizontal">
        <badge
            v-if="index != null"
            class="volume-meter-talent-index"
        >
            {{ props.index }}
        </badge>
        <canvas
            ref="volumeMeterCanvas"
            class="max-width"
        />
    </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { colors } from '../../styles/colors';
import { useMixerStore } from 'client-shared/stores/MixerStore';
import Badge from 'components/Badge.vue';
import { CHANNEL_LEVEL_EXPONENT, useExperimentalAccurateChannelMeters } from 'client-shared/helpers/MixerHelper';
import { MixerVolumeMeterChannelAssignment } from '../../helpers/MixerVolumeMeter';

const mixerStore = useMixerStore();

const props = defineProps<{
    channelAssignments: MixerVolumeMeterChannelAssignment
    index?: number
}>();

const volumeMeterCanvas = ref<HTMLCanvasElement>();
onMounted(() => {
    const canvas = volumeMeterCanvas.value;
    if (canvas == null) {
        console.warn('Mounted MixerVolumeMeter with no canvas?');
        return;
    }
    const ctx = canvas.getContext('2d');
    let width = canvas.clientWidth;
    if (ctx == null) {
        console.warn('Received no canvas context');
        return;
    }

    let alive = true;

    // The canvas looks blurry in OBS if I don't scale it up
    const canvasScale = 2;
    const resizeObserver = new ResizeObserver(entries => {
        if (entries.length !== 1) return;
        width = entries[0].contentRect.width;
        canvas.width = entries[0].contentRect.width * canvasScale;
        canvas.height = entries[0].contentRect.height * canvasScale;
        ctx.scale(canvasScale, canvasScale);
    });
    resizeObserver.observe(canvas);
    onUnmounted(() => {
        alive = false;
        resizeObserver.disconnect();
    });

    const peakThreshold = 3;
    const smallDotDiameter = 5;
    const smallDotVerticalSpacing = 2;
    const dotDiameter = 10;
    const dotSpacing = 3;
    const meterAlphaValues: number[] = [];
    const meterAlphaSpeed = 0.25;
    let lastTime = 0;
    let currentLevel = 0;
    let targetLevel = 0;

    watch(() => {
        if (props.channelAssignments.channelIds.length === 0) {
            return [-90, props.channelAssignments.speakingThresholdDB];
        } else if (props.channelAssignments.channelIds.length === 1) {
            return [
                mixerStore.mixerChannelLevels[props.channelAssignments.channelIds[0]] ?? -90,
                props.channelAssignments.speakingThresholdDB
            ];
        } else {
            return [
                Math.max(...props.channelAssignments.channelIds.map(channelId => mixerStore.mixerChannelLevels[channelId] ?? -90)),
                props.channelAssignments.speakingThresholdDB
            ];
        }
    }, ([channelLevel, speakingThreshold]) => {
        if (useExperimentalAccurateChannelMeters) {
            targetLevel = channelLevel > speakingThreshold ? (channelLevel + 90) / 100 : 0;
        } else {
            targetLevel = channelLevel > speakingThreshold ? ((channelLevel + 90) / 100) ** (1 / CHANNEL_LEVEL_EXPONENT) : 0;
        }
    }, { immediate: true });

    const redraw = (time: number) => {
        if (!alive) {
            return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const deltaTime = time - lastTime;
        lastTime = time;
        if (currentLevel > targetLevel) {
            currentLevel = Math.max(targetLevel, currentLevel - deltaTime / 250);
        } else if (currentLevel < targetLevel) {
            currentLevel = Math.min(targetLevel, currentLevel + deltaTime / 25);
        }

        ctx.fillStyle = colors.vfdTealUnlit;
        const dotCount = Math.floor((width + dotSpacing) / (dotDiameter + dotSpacing));
        const litDotCount = Math.round(dotCount * currentLevel);
        const xOffset = (width - (dotCount * (dotDiameter + dotSpacing) - dotSpacing)) / 2 + dotDiameter / 2;
        for (let i = 0; i < dotCount; i++) {
            const color = i >= dotCount - peakThreshold ? 'peak' : 'normal';
            const drawSmallDot = i >= dotCount - peakThreshold
                ? i === dotCount - peakThreshold
                : i > 12 ? (i - 4) % 8 === 0 : i % 4 === 0;
            if (drawSmallDot) {
                ctx.fillStyle = color === 'peak' ? colors.vfdRed : colors.vfdTeal;
                ctx.beginPath();
                ctx.arc(
                    i * (dotDiameter + dotSpacing) + xOffset,
                    smallDotDiameter / 2,
                    smallDotDiameter / 2,
                    0,
                    Math.PI * 2);
                ctx.fill();
            }

            ctx.beginPath();
            ctx.arc(
                i * (dotDiameter + dotSpacing) + xOffset,
                smallDotDiameter + smallDotVerticalSpacing + dotDiameter / 2,
                dotDiameter / 2,
                0,
                Math.PI * 2);
            ctx.fillStyle = color === 'peak' ? colors.vfdRedUnlit : colors.vfdTealUnlit;
            ctx.fill();

            const existingAlphaValue = meterAlphaValues[i] ?? 0;
            const litPortionAlpha = i < litDotCount
                ? meterAlphaValues[i] = Math.min(1, existingAlphaValue + meterAlphaSpeed)
                : meterAlphaValues[i] = Math.max(0, existingAlphaValue - meterAlphaSpeed);

            ctx.fillStyle = color === 'peak' ? `rgba(239, 53, 50, ${litPortionAlpha})` : `rgba(153, 251, 249, ${litPortionAlpha})`;
            ctx.fill();
        }

        requestAnimationFrame(redraw);
    }

    redraw(0);
});
</script>

<style scoped lang="scss">
.volume-meter-talent-index {
    font-size: 18px;
    min-width: 18px;
    height: 20px;
    line-height: 19px;
    text-align: center;
    margin-top: -2px;
    font-weight: 600;
}
</style>
