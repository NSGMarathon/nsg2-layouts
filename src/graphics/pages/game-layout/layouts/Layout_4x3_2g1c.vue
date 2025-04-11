<template>
    <div class="layout-wrapper layout vertical">
        <div class="game-captures-row layout-gap-bottom">
            <div class="bg-panel" />
            <div
                class="game-capture"
                data-capture-index="0"
            >
                <team-result-display
                    :nameplate-index="0"
                    x-position="left"
                    y-position="bottom"
                />
            </div>
            <large-separator direction="vertical" />
            <div
                class="game-capture"
                data-capture-index="1"
            >
                <team-result-display
                    :nameplate-index="1"
                    x-position="right"
                    y-position="bottom"
                />
            </div>
            <div class="bg-panel" />
        </div>
        <div class="other-content-row">
            <div class="column">
                <player-nameplate :index="0" />
                <div class="timer-wrapper bg-timer layout vertical center-vertical grow">
                    <speedrun-details class="bg-inset" />
                    <speedrun-timer class="m-t-8 bg-inset" />
                </div>
            </div>
            <div
                class="camera-capture"
                data-capture-index="0"
            />
            <div class="column">
                <player-nameplate :index="1" />
                <div class="grow bg-panel layout vertical">
                    <other-nameplate-grid class="m-t-8 m-x-16" />
                    <media-box class="grow m-x-32 m-y-16" />
                </div>
            </div>
        </div>
        <large-separator direction="horizontal" />
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
    width: 100%;
    position: relative;
}

.game-captures-row {
    display: grid;
    grid-template-columns: 100px auto 14px auto 100px;
    width: 100%;
}

.other-content-row {
    display: grid;
    grid-template-columns: 2.5fr 3fr 2.5fr;
    width: 100%;
    height: 100%;
}

.timer-wrapper {
    padding: 18px;
    position: relative;

    > * {
        width: 100%;
        height: 105px;
    }
}

.column {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-style: solid;
    border-width: 0 3px 3px 3px;
    border-color: colors.$layout-gap;
}
</style>
