<template>
    <div class="layout-wrapper">
        <div class="layout vertical">
            <div
                class="camera-capture layout-gap-bottom"
                data-capture-index="0"
            />
            <div class="grow layout vertical bg-panel">
                <player-nameplate :index="0" :max-concurrent-players="4" />
                <other-nameplate-grid class="m-t-12 m-b-64 m-x-16" />
                <div class="layout vertical center-vertical grow m-b-64 m-x-16">
                    <media-box class="max-height" style="max-height: 275px" />
                </div>
            </div>
        </div>
        <large-separator direction="vertical" />
        <div class="layout vertical">
            <div
                class="game-capture layout-gap-bottom"
                data-capture-index="0"
            />
            <div class="timer-wrapper grow bg-timer layout-gap-bottom layout-gap-right layout horizontal center-vertical center-horizontal">
                <speedrun-timer class="bg-inset" />
                <speedrun-details class="m-l-16 bg-inset" />
            </div>
        </div>
        <large-separator
            direction="horizontal"
            style="grid-column: span 3"
        />
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

.layout-wrapper {
    display: grid;
    grid-template-columns: 445px 14px 1fr;
    grid-template-rows: 1fr 14px;
}

.camera-capture {
    aspect-ratio: 4 / 3;
    width: 100%;
}

.game-capture {
    aspect-ratio: 16 / 9;
    width: 100%;
}

.timer-wrapper > * {
    width: 580px;
    height: 110px;
}
</style>
