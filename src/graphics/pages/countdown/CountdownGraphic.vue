<template>
    <div
        class="countdown-wrapper layout vertical center-vertical center-horizontal"
        :class="{ 'without-background': !countdownStore.countdownData.showBackground }"
    >
        <div class="bg-panel layout-gap-around side-panel" />
        <div class="bg-panel layout-gap-top" />
        <div class="bg-panel layout-gap-around side-panel" />
        <div class="main-panel bg-panel layout-gap-top layout vertical center-vertical center-horizontal">
            <img
                src="../../assets/img/large-logo.png"
                class="event-logo"
            >
            <div class="info-panel-wrapper m-t-32">
                <div class="info-wrapper bg-inset layout vertical center-horizontal">
                    <vfd-pixel-text
                        :font-size="36"
                        :text-content="countdownStore.countdownData.messageText"
                        class="max-width m-t-12"
                    />
                    <seven-segment-digits
                        unlit-segment="00:00:00"
                        :value="duration.value"
                        :flash="duration.flash"
                        always-lit-segment="!!!!!:!!"
                        class="countdown"
                    />
                </div>
            </div>
        </div>
        <div class="bg-panel layout-gap-bottom layout-gap-top" />
    </div>
</template>

<script setup lang="ts">
import { useCountdownStore } from 'client-shared/stores/CountdownStore';
import { computed } from 'vue';
import { Duration } from 'luxon';
import SevenSegmentDigits from 'components/SevenSegmentDigits.vue';
import { padNumber } from 'client-shared/helpers/StringHelper';
import VfdPixelText from 'components/VfdPixelText.vue';

const countdownStore = useCountdownStore();
const duration = computed(() => {
    const parsedDuration = Duration.fromMillis(countdownStore.countdownTimer).shiftTo('hours', 'minutes', 'seconds', 'milliseconds');
    if (parsedDuration.hours > 0) {
        return {
            value: `${Math.min(99, parsedDuration.hours)}:${padNumber(parsedDuration.minutes)}:${padNumber(parsedDuration.seconds)}`,
            flash: false
        };
    } else {
        return {
            value: `${padNumber(parsedDuration.minutes)}:${padNumber(parsedDuration.seconds)}`,
            flash: parsedDuration.milliseconds === 0
        };
    }
});
</script>

<style scoped lang="scss">
@use '../../styles/colors';

.countdown-wrapper {
    height: calc(100%);
    width: 100%;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1250px) minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) minmax(0, 4fr) minmax(0, 1fr);

    > * {
        height: 100%;
    }

    &.without-background > * {
        border-width: 0;
        background: none;
    }

    &.without-background .info-panel-wrapper {
        background: colors.$layout-panel-background;
        padding: 16px;
        border: 3px solid colors.$layout-gap;
    }
}

.side-panel {
    grid-row: span 3;
}

.info-wrapper {
    width: 850px;
}

.event-logo {
    height: 350px;
}

.message {
    margin-top: 24px;
    color: white;
    font-weight: 700;
    font-size: 64px;
}

.countdown {
    margin: 28px 0 16px;
    font-size: 64px;
}
</style>
