<template>
    <div class="layout-wrapper">
        <div class="layout horizontal max-width" style="height: 986px; overflow: hidden">
            <div class="layout vertical">
                <div
                    class="game-capture"
                    data-capture-index="0"
                >
                    <team-result-display
                        :nameplate-index="0"
                        x-position="right"
                        y-position="bottom"
                        animation-direction="x"
                    />
                </div>
                <div class="layout-gap horizontal" />
                <div
                    class="game-capture"
                    data-capture-index="2"
                >
                    <team-result-display
                        :nameplate-index="2"
                        x-position="right"
                        y-position="bottom"
                        animation-direction="x"
                    />
                </div>
            </div>
            <div class="layout-gap-right layout-gap-left grow middle-panel">
                <div class="max-height layout vertical">
                    <div class="bg-timer timer-wrapper grow layout vertical center-vertical">
                        <speedrun-details class="bg-inset" />
                        <speedrun-timer class="bg-inset m-t-8" />
                    </div>
                    <div class="nameplate-layout">
                        <player-nameplate :index="0" class="max-width" fixed-height />
                        <player-nameplate :index="1" class="max-width" fixed-height />
                    </div>
                </div>
                <div
                    class="camera-capture"
                    data-capture-index="0"
                />
                <div class="bg-panel layout vertical">
                    <div class="nameplate-layout">
                        <player-nameplate :index="2" class="max-width" fixed-height />
                        <player-nameplate :index="3" class="max-width" fixed-height />
                    </div>
                    <other-nameplate-grid class="m-x-16 m-t-4" />
                    <media-box class="max-height m-y-16 m-x-16" />
                </div>
            </div>
            <div class="layout vertical">
                <div
                    class="game-capture"
                    data-capture-index="1"
                >
                    <team-result-display
                        :nameplate-index="1"
                        x-position="left"
                        y-position="bottom"
                        animation-direction="x"
                    />
                </div>
                <div class="layout-gap horizontal" />
                <div
                    class="game-capture"
                    data-capture-index="3"
                >
                    <team-result-display
                        :nameplate-index="3"
                        x-position="left"
                        y-position="bottom"
                        animation-direction="x"
                    />
                </div>
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
</script>

<style scoped lang="scss">
@use '../../../styles/colors';

.game-capture {
    aspect-ratio: 4 / 3;
    height: calc(50% - 1.5px);
    position: relative;
    overflow: hidden;
}

.middle-panel {
    display: grid;
    grid-template-rows: 1fr 1fr 1.25fr;
}

.timer-wrapper {
    padding: 8px 12px;
}

.column {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-style: solid;
    border-width: 0 3px 3px 3px;
    border-color: colors.$layout-gap;
}

.nameplate-layout {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
}
</style>
