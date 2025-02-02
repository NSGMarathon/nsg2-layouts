<template>
    <div class="layout horizontal">
        <badge class="volume-meter-talent-index">{{ props.index }}</badge>
        <canvas
            ref="volumeMeterCanvas"
            class="max-width"
        />
    </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { colors } from '../../styles/colors';
import { defaultSpeakingThreshold, useMixerStore } from 'client-shared/stores/MixerStore';
import Badge from 'components/Badge.vue';
import { CHANNEL_LEVEL_EXPONENT } from 'shared/MixerHelper';
import { MixerChannelAssignment } from 'types/schemas';
import { useScheduleStore } from 'client-shared/stores/ScheduleStore';

const mixerStore = useMixerStore();
const scheduleStore = useScheduleStore();

const props = defineProps<{
    talentId?: string
    teamId?: string
    index: number
}>();

const volumeMeterCanvas = ref<HTMLCanvasElement>();
onMounted(() => {
    const canvas = volumeMeterCanvas.value;
    if (canvas == null) {
        console.warn('Mounted PlayerVolumeMeter with no canvas?');
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
    let lastTime = 0;
    let currentLevel = 0;
    let targetLevel = 0;

    // If the volume meter is assigned to a player, look for the player's mixer channel then the team's channel
    // If the volume meter is only assigned to a team, look for the team's channel then try to get the highest level out of all team players
    const assignmentData = ref<{
        channelIds: number[]
        speakingThresholdDB: number
    }>({
        channelIds: [],
        speakingThresholdDB: defaultSpeakingThreshold
    });

    watch(() => [
        props.talentId,
        props.teamId,
        mixerStore.talentMixerChannelAssignments,
        scheduleStore.activeSpeedrun?.teams
    ], () => {
        let assignments: MixerChannelAssignment[] | undefined = undefined;

        if (props.talentId != null) {
            const talentAssignment = mixerStore.talentMixerChannelAssignments.speedrunTalent[props.talentId];
            if (talentAssignment != null) {
                assignments = [talentAssignment];
            }
        }

        if (assignments == null && props.teamId != null) {
            const teamAssignment = mixerStore.talentMixerChannelAssignments.speedrunTeams[props.teamId];
            if (teamAssignment != null) {
                assignments = [teamAssignment];
            }

            if (assignments == null && props.talentId == null) {
                const team = scheduleStore.activeSpeedrun?.teams.find(team => team.id === props.teamId);
                if (team != null) {
                    assignments = team.playerIds
                        .map(playerId => mixerStore.talentMixerChannelAssignments.speedrunTalent[playerId.id])
                        .filter(assignment => assignment != null);
                }
            }
        }

        if (assignments == null || assignments.length === 0) {
            assignmentData.value = {
                channelIds: [],
                speakingThresholdDB: defaultSpeakingThreshold
            };
        } else if (assignments.length === 1) {
            assignmentData.value = {
                channelIds: [assignments[0].channelId],
                speakingThresholdDB: assignments[0].speakingThresholdDB ?? defaultSpeakingThreshold
            };
        } else {
            const highestSpeakingThreshold = Math.max(...assignments.map(assignment => assignment.speakingThresholdDB ?? defaultSpeakingThreshold));
            assignmentData.value = {
                channelIds: assignments.map(assignment => assignment.channelId),
                speakingThresholdDB: highestSpeakingThreshold
            };
        }
    }, { immediate: true });

    watch(() => {
        if (assignmentData.value.channelIds.length === 0) {
            return [-90, assignmentData.value.speakingThresholdDB];
        } else if (assignmentData.value.channelIds.length === 1) {
            return [
                mixerStore.mixerChannelLevels[assignmentData.value.channelIds[0]] ?? -90,
                assignmentData.value.speakingThresholdDB
            ];
        } else {
            return [
                Math.max(...assignmentData.value.channelIds.map(channelId => mixerStore.mixerChannelLevels[channelId] ?? -90)),
                assignmentData.value.speakingThresholdDB
            ];
        }
    }, ([channelLevel, speakingThreshold]) => {
        targetLevel = channelLevel > speakingThreshold ? ((channelLevel + 90) / 100) ** (1 / CHANNEL_LEVEL_EXPONENT) : 0;
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
            currentLevel = Math.min(targetLevel, currentLevel + deltaTime / 100);
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

            if (i >= litDotCount) {
                ctx.fillStyle = color === 'peak' ? colors.vfdRedUnlit : colors.vfdTealUnlit;
            } else {
                ctx.fillStyle = color === 'peak' ? colors.vfdRed : colors.vfdTeal;
            }

            ctx.beginPath();
            ctx.arc(
                i * (dotDiameter + dotSpacing) + xOffset,
                smallDotDiameter + smallDotVerticalSpacing + dotDiameter / 2,
                dotDiameter / 2,
                0,
                Math.PI * 2);
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
