<template>
    <div
        class="intermission-layout"
        :class="{
            'with-visualizer-space': addVisualizerSpace,
            'with-camera-space': addCameraSpace,
            'with-prizes': showPrizes
        }"
    >
        <div class="left-panel layout-gap-around">
            <div class="bg-panel layout-gap-bottom layout vertical center-vertical grow">
                <div class="layout horizontal logos grow">
                    <img src="../../assets/img/large-logo.png">
                    <media-box class="media-box" />
                </div>
                <div class="bg-inset donation-total-wrapper layout horizontal center-vertical center-horizontal">
                    <donation-total class="donation-total m-l-8" show-converted-currency />
                    <div class="pointer-icon">»</div>
                    <div
                        class="charity-logo"
                    />
                </div>
            </div>
            <div class="bg-panel">
                <intermission-prize-display
                    v-if="showPrizes"
                    class="max-width m-b-16 prize-display"
                />
                <div class="bg-inset slide-rotation">
                    <omnibar-slide-rotation
                        :slide-title-width="150"
                        without-donation-reminder
                        without-schedule-items
                    />
                </div>
                <div class="bg-inset m-t-16 layout vertical">
                    <div class="layout horizontal center-vertical">
                        <table class="host-display-table">
                            <tbody>
                            <other-nameplate-grid-cell
                                :talent="currentHost"
                                cell-index="H"
                            />
                            </tbody>
                        </table>
                        <div class="music-icon">♫</div>
                        <div class="grow" style="margin-top: -4px">
                            <vfd-pixel-text
                                :font-size="24"
                                :text-content="musicStore.musicState.track?.artist ?? 'Unknown Artist'"
                                align="left"
                                text-align="left"
                            />
                            <vfd-pixel-text
                                :font-size="24"
                                :text-content="musicStore.musicState.track?.song ?? 'Unknown Song'"
                                align="left"
                                text-align="left"
                            />
                        </div>
                    </div>
                    <div
                        v-if="addVisualizerSpace"
                        style="height: 120px"
                    />
                </div>
            </div>
        </div>
        <large-separator direction="vertical" />
        <div class="right-panel layout-gap-right layout-gap-top layout-gap-bottom">
            <div class="bg-panel">
                <intermission-schedule />
            </div>
            <div
                v-if="addCameraSpace"
                class="bg-panel layout-gap-top grow"
            >
                <div class="bg-inset camera-border max-height" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import LargeSeparator from 'components/LargeSeparator.vue';
import IntermissionSchedule from './IntermissionSchedule.vue';
import MediaBox from 'components/MediaBox.vue';
import IntermissionPrizeDisplay from './IntermissionPrizeDisplay.vue';
import DonationTotal from 'components/DonationTotal.vue';
import OmnibarSlideRotation from 'components/omnibar/OmnibarSlideRotation.vue';
import { computed, provide } from 'vue';
import {
    MaxOmnibarBidWarItemsInjectionKey,
    MaxOmnibarBidWarTitleWidthInjectionKey
} from '../../../dashboard/helpers/Injections';
import VfdPixelText from 'components/VfdPixelText.vue';
import { useTalentStore } from 'client-shared/stores/TalentStore';
import { useMusicStore } from 'client-shared/stores/MusicStore';
import { Configschema } from 'types/schemas';
import { useCurrentTrackerDataStore } from 'client-shared/stores/CurrentTrackerDataStore';
import OtherNameplateGridCell from 'components/OtherNameplateGridCell.vue';

const currentTrackerDataStore = useCurrentTrackerDataStore();

const addVisualizerSpace = (nodecg.bundleConfig as Configschema).intermission?.addVisualizerSpace ?? false;
const addCameraSpace = (nodecg.bundleConfig as Configschema).intermission?.addCameraSpace ?? true;
const showPrizes = computed(() => currentTrackerDataStore.currentPrizes.length > 0);

provide(MaxOmnibarBidWarItemsInjectionKey, 3);
provide(MaxOmnibarBidWarTitleWidthInjectionKey, 200);

const talentStore = useTalentStore();
const musicStore = useMusicStore();
const currentHost = computed(() => talentStore.findTalentItemById(talentStore.currentHostId));
</script>

<style scoped lang="scss">
@use 'sass:color';
@use '../../styles/colors';

.intermission-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 14px minmax(0, 1fr);
    height: 100%;

    .bg-panel {
        padding: 30px 50px;
    }

    > .left-panel, > .right-panel {
        display: flex;
        flex-direction: column;
    }

    &.with-camera-space {
        > .right-panel {
            $schedule-height: 736px;
            // Will explode if the schedule's height changes, but I don't foresee that.
            // ~inky, 2 years later: it changed :)
            clip-path: polygon(
                0% 0%,
                0% 100%,
                53px 100%,
                53px $schedule-height,
                calc(100% - 56px) $schedule-height,
                calc(100% - 56px) calc(100% - 36px),
                50px calc(100% - 36px),
                53px 100%,
                100% 100%,
                100% 0%);

            > .camera-border {
                margin-top: 40px;
                margin-bottom: 10px;
                height: 100%;
            }
        }
    }

    &:not(.with-camera-space) {
        > .right-panel > * {
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
    }

    &.with-prizes {
        .logos {
            max-height: 250px;
        }

        .donation-total-wrapper {
            margin-top: 16px;
        }
    }

    &.with-visualizer-space {
        .prize-display {
            height: 225px;
        }

        &.with-prizes .logos {
            max-height: 200px;
        }
    }
}

.donation-total-wrapper {
    margin-top: 48px;
    overflow: hidden;
    height: 130px;
}

.logos {
    justify-content: space-between;
    align-items: center;
    margin: 8px 60px;
    max-height: 300px;

    img {
        height: 100%;
        object-fit: contain;
    }

    .media-box {
        width: 400px;
        height: 100%;
    }
}

.prize-display {
    height: 300px;
}

.donation-total {
    font-size: 1.5em;
}

.pointer-icon {
    color: colors.$vfd-teal;
    font-size: 3em;
    margin: 0 16px;
}

.charity-logo {
    flex-grow: 1;
    height: 100%;
    margin: 0 16px;
    background-image: url('../../assets/img/charity-logo-wide.png');
    background-position: center;
    background-size: contain;
    background-repeat: no-repeat;
}

.host-display-table {
    border-collapse: collapse;
    table-layout: fixed;
    width: 250px;
    height: 73px;
}

.music-icon {
    font-size: 40px;
    color: colors.$vfd-teal;
    margin: -4px 12px 0;
}

.slide-rotation {
    overflow: hidden;
    height: 80px;
    padding: 0;
}

.converted-donation-total-note {
    color: colors.$vfd-teal;
    font-size: 28px;
    font-weight: 500;
    margin-top: -4px;
    line-height: 26px;
    text-align: center;
}
</style>
