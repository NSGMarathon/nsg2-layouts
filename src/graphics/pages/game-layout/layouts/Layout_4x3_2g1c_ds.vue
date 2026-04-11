<template>
    <div class="layout-wrapper layout vertical" style="overflow: hidden;">
        <div class="layout horizontal grow" style="overflow: hidden;">
            <div class="layout vertical" style="max-width: 500px">
                <div
                    class="game-capture layout-gap-bottom"
                    data-capture-index="1"
                />
                <div
                    class="camera-capture layout-gap-bottom"
                    data-capture-index="0"
                />
                <div class="grow layout vertical bg-panel">
                    <player-nameplate :index="0" />
                    <other-nameplate-grid class="m-t-8 m-x-16" />
                    <media-box class="grow m-y-16 m-x-16" />
                </div>
            </div>
            <large-separator direction="vertical" />
            <div class="layout vertical max-width">
                <div class="layout horizontal grow layout-gap-top">
                    <div class="bg-panel grow layout-gap-right" />
                    <div
                        class="game-capture"
                        data-capture-index="0"
                    />
                    <div class="bg-panel grow layout-gap-left layout-gap-right" />
                </div>
                <div class="bg-timer timer-wrapper layout-gap-top layout-gap-right layout-gap-bottom layout horizontal center-horizontal center-vertical">
                    <speedrun-timer class="bg-inset" />
                    <speedrun-details class="m-l-16 bg-inset" />
                </div>
            </div>
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
    height: 300px;
}

.game-capture {
    aspect-ratio: 4 / 3;
}

.timer-wrapper {
    padding: 8px 14px;
}

.timer-wrapper {
    height: 145px;

    > * {
        width: 580px;
        height: 110px;
    }
}
</style>
