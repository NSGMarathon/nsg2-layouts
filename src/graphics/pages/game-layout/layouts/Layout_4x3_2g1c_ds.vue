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
            <div class="layout vertical max-width" style="position: relative; overflow: hidden">
                <div class="layout horizontal grow layout-gap-top">
                    <div class="bg-panel grow layout-gap-right" />
                    <div
                        class="game-capture"
                        data-capture-index="0"
                    />
                    <div class="bg-panel grow layout-gap-left layout-gap-right" />
                </div>
                <div class="under-game layout vertical layout-gap-top layout-gap-bottom layout-gap-right">
                    <game-content-advisory fixed-height />
                    <div class="bg-timer grow timer-wrapper layout horizontal center-horizontal center-vertical">
                        <speedrun-timer class="bg-inset" />
                        <speedrun-details class="m-l-16 bg-inset" />
                    </div>
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
import GameContentAdvisory from '../GameContentAdvisory.vue';
</script>

<style scoped lang="scss">
@use '../../../styles/colors';

.camera-capture {
    height: 300px;
}

.game-capture {
    aspect-ratio: 4 / 3;
}

.under-game {
    height: 160px;
}

.timer-wrapper > * {
    width: 580px;
    height: 110px;
}

.content-advisory {
    width: 100%;
    height: 32px;
    font-size: 22px;
}
</style>
