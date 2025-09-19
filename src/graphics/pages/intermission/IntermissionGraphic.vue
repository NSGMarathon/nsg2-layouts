<template>
    <div
        class="intermission-layout"
        :class="{
            'with-visualizer-space': addVisualizerSpace,
            'with-camera-space': addCameraSpace,
            'with-prizes': showPrizes
        }"
    >
        <div class="bg-panel left-panel">
            <div class="layout horizontal logos grow">
                <img src="../../assets/img/large-logo.png">
                <media-box class="media-box" />
            </div>
            <intermission-prize-display
                v-if="showPrizes"
                class="max-width prize-display"
            />
            <div class="bg-inset m-t-16 layout vertical center-horizontal">
                <div class="layout horizontal center-vertical">
                    <donation-total class="donation-total" />
                    <div class="pointer-icon">»</div>
                    <img
                        class="charity-logo"
                        src="../../assets/img/charity-logo-main.png"
                    >
                </div>
            </div>
            <div class="bg-inset m-t-16 slide-rotation">
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
        <large-separator direction="vertical" />
        <div class="bg-panel right-panel">
            <intermission-schedule />
            <div
                v-if="addCameraSpace"
                class="bg-inset camera-border"
            />
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

    > .bg-panel {
        padding: 40px 50px;
        display: flex;
        flex-direction: column;
    }

    &.with-camera-space {
        > .bg-panel.right-panel {
            $schedule-height: 723px;
            // Will explode if the schedule's height changes, but I don't foresee that.
            clip-path: polygon(0% 0%, 0% 100%, 53px 100%, 53px $schedule-height, calc(100% - 53px) $schedule-height, calc(100% - 53px) calc(100% - 53px), 50px calc(100% - 53px), 53px 100%, 100% 100%, 100% 0%);

            > .camera-border {
                margin-top: 40px;
                margin-bottom: 10px;
                height: 100%;
            }
        }
    }

    &:not(.with-camera-space) {
        > .bg-panel.right-panel {
            justify-content: center;
        }
    }

    &:not(.with-prizes) {
        .logos {
            img {
                width: 300px;
            }
        }

        .left-panel > * {
            margin-top: 24px;
        }
    }

    &.with-visualizer-space {
        .prize-display {
            height: 250px;
            margin-top: 32px;
        }

        .logos {
            margin-top: 0;

            img {
                width: 225px;
            }
        }
    }
}

.logos {
    justify-content: space-between;
    margin: 16px 60px 0;

    img {
        width: 250px;
        object-fit: contain;
    }

    .media-box {
        width: 400px;
        height: 100%;
    }
}

.prize-display {
    margin-top: 16px;
    height: 300px;
}

.donation-total {
    font-size: 1.5em;
}

.pointer-icon {
    color: colors.$vfd-teal;
    font-size: 3em;
    margin: 0 32px;
}

.charity-logo {
    height: 150px;
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
</style>
