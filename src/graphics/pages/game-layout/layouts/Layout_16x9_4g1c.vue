<template>
    <div class="layout-wrapper">
        <div class="main-layout" style="height: 986px; overflow: hidden">
            <div class="layout vertical center-horizontal">
                <div
                    class="game-capture"
                    data-capture-index="0"
                >
                    <team-result-display
                        :nameplate-index="0"
                        x-position="center"
                        y-position="bottom"
                    />
                </div>
                <player-nameplate :index="0" class="max-width" fixed-height />
                <large-separator direction="horizontal" class="max-width" />
                <div
                    class="game-capture"
                    data-capture-index="2"
                >
                    <team-result-display
                        :nameplate-index="2"
                        x-position="center"
                        y-position="bottom"
                    />
                </div>
                <player-nameplate :index="2" class="max-width" fixed-height />
            </div>
            <div class="layout-gap-right layout-gap-left layout-gap-bottom middle-panel layout vertical">
                <div
                    class="camera-capture"
                    data-capture-index="0"
                />
                <div class="layout vertical" style="min-height: 250px">
                    <game-content-advisory narrow class="layout-gap-top" />
                    <div class="bg-timer timer-wrapper grow layout vertical center-vertical layout-gap-top layout-gap-bottom">
                        <div class="bg-inset">
                            <speedrun-details />
                            <speedrun-timer class="m-t-16" hide-run-number />
                        </div>
                    </div>
                </div>
                <div class="bg-panel layout vertical grow">
                    <other-nameplate-grid class="m-x-16 m-t-8" />
                    <media-box class="max-height m-y-64 m-x-64" />
                </div>
            </div>
            <div class="layout vertical center-horizontal">
                <div
                    class="game-capture"
                    data-capture-index="1"
                >
                    <team-result-display
                        :nameplate-index="1"
                        x-position="center"
                        y-position="bottom"
                    />
                </div>
                <player-nameplate :index="1" class="max-width" fixed-height />
                <large-separator direction="horizontal" class="max-width" />
                <div
                    class="game-capture"
                    data-capture-index="3"
                >
                    <team-result-display
                        :nameplate-index="3"
                        x-position="center"
                        y-position="bottom"
                    />
                </div>
                <player-nameplate :index="3" class="max-width" fixed-height />
            </div>
        </div>
        <large-separator direction="horizontal" class="max-width" />
    </div>
</template>

<script setup lang="ts">
import LargeSeparator from 'components/LargeSeparator.vue';
import PlayerNameplate from '../PlayerNameplate.vue';
import SpeedrunDetails from '../SpeedrunDetails.vue';
import SpeedrunTimer from '../SpeedrunTimer.vue';
import OtherNameplateGrid from '../OtherNameplateGrid.vue';
import MediaBox from 'components/MediaBox.vue';
import TeamResultDisplay from '../TeamResultDisplay.vue';
import GameContentAdvisory from '../GameContentAdvisory.vue';
</script>

<style scoped lang="scss">
@use '../../../styles/colors';

.game-capture {
    aspect-ratio: 16 / 9;
    flex-grow: 1;
    position: relative;
}

.camera-capture {
    height: 300px;
}

.main-layout {
    display: grid;
    grid-template-columns: 1fr 475px 1fr;
}

.middle-panel {
    overflow: hidden;
}

.timer-wrapper {
    padding: 8px 8px;
}

.column {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-style: solid;
    border-width: 0 3px 3px 3px;
    border-color: colors.$layout-gap;
}

.player-nameplate {
    max-height: 80px;
}
</style>
