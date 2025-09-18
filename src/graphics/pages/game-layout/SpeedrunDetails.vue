<template>
    <div class="speedrun-details">
        <vfd-pixel-text
            :font-size="25"
            :text-content="scheduleStore.activeSpeedrun?.title"
            class="speedrun-title"
        />
        <div
            class="layout horizontal m-t-4"
            style="align-items: flex-end"
        >
            <div class="max-width">
                <vfd-pixel-text
                    :font-size="20"
                    :text-content="systemAndReleaseYear"
                    align="left"
                />
                <vfd-pixel-text
                    :font-size="20"
                    :text-content="scheduleStore.activeSpeedrun?.category"
                    align="left"
                />
            </div>
            <speedrun-estimate-display
                :estimate="scheduleStore.activeSpeedrun?.estimate"
                :timer-mode="scheduleStore.activeSpeedrun?.timerMode"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import VfdPixelText from 'components/VfdPixelText.vue';
import { useScheduleStore } from 'client-shared/stores/ScheduleStore';
import { computed } from 'vue';
import { isBlank } from 'shared/StringHelper';
import SpeedrunEstimateDisplay from 'components/SpeedrunEstimateDisplay.vue';

const scheduleStore = useScheduleStore();

const systemAndReleaseYear = computed(() =>
    [scheduleStore.activeSpeedrun?.system, scheduleStore.activeSpeedrun?.releaseYear].filter(item => !isBlank(item)).join('·'));
</script>

<style scoped lang="scss">
@use '../../styles/colors';
@use '../../styles/decorations';

.speedrun-details {
    display: flex;
    flex-direction: column;
    justify-content: center;
    box-sizing: border-box;
}

.speedrun-title {
    margin-top: -4px;
}
</style>
