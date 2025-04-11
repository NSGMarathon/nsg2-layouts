<template>
    <div class="layout-wrapper layout vertical">
        <div class="game-captures-row layout-gap-bottom">
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
            <div class="layout-gap" />
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
            <div class="layout-gap" />
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
            <player-nameplate :index="0" fixed-height />
            <div class="layout-gap" />
            <player-nameplate :index="1" class="layout-gap-right layout-gap-left" fixed-height />
            <div class="layout-gap" />
            <player-nameplate :index="2" fixed-height />
        </div>
        <div class="other-content-row">
            <div class="column">
                <div class="timer-wrapper bg-timer layout vertical center-vertical max-height">
                    <speedrun-details class="bg-inset" />
                    <speedrun-timer class="m-t-8 bg-inset" />
                    <img
                        src="../../../assets/img/lslogo-white.png"
                        class="livesplit-logo"
                    >
                </div>
            </div>
            <div
                class="camera-capture"
                data-capture-index="0"
            />
            <div class="column">
                <div class="max-height bg-panel layout vertical">
                    <other-nameplate-grid class="m-t-8 m-x-16" />
                    <media-box class="grow m-x-32 m-y-48" />
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
    grid-template-columns: 1fr 3px 1fr 3px 1fr;
    grid-template-rows: auto 80px;
    width: 100%;
}

.layout-gap {
    background-color: colors.$layout-gap;
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

    > *:not(img) {
        width: 100%;
        height: 105px;
    }

    .livesplit-logo {
        width: 150px;
        position: absolute;
        opacity: 75%;
        bottom: 23px;
        left: 50%;
        transform: translateX(-50%);
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
