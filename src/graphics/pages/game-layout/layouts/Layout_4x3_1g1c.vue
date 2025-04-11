<template>
    <div class="layout-wrapper layout vertical" style="overflow:hidden;">
        <div class="layout horizontal grow">
            <div class="layout vertical">
                <div
                    class="camera-capture layout-gap-bottom"
                    data-capture-index="0"
                />
                <div class="grow layout vertical bg-panel">
                    <player-nameplate :index="0" :max-concurrent-players="4" />
                    <div class="timer-wrapper bg-timer layout-gap-bottom layout vertical center-vertical">
                        <div class="bg-inset">
                            <speedrun-details />
                            <speedrun-timer hide-run-number class="m-t-16" />
                        </div>
                    </div>
                    <other-nameplate-grid class="m-t-8 m-x-16" />
                    <media-box class="grow m-y-32 m-x-32" />
                </div>
            </div>
            <large-separator direction="vertical" />
            <div
                class="game-capture"
                data-capture-index="0"
            />
        </div>
        <large-separator direction="horizontal" />
    </div>
</template>

<script setup lang="ts">
import LargeSeparator from 'components/LargeSeparator.vue';
import PlayerNameplate from '../PlayerNameplate.vue';
import SpeedrunTimer from '../SpeedrunTimer.vue';
import SpeedrunDetails from '../SpeedrunDetails.vue';
import OtherNameplateGrid from '../OtherNameplateGrid.vue';
import MediaBox from 'components/MediaBox.vue';
</script>

<style scoped lang="scss">
@use '../../../styles/colors';

.camera-capture {
    height: 350px;
}

.game-capture {
    aspect-ratio: 4 / 3;
    flex-grow: 1;
}

.timer-wrapper {
    padding: 8px 48px;
}
</style>
