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
                <div class="m-b-8 layout horizontal center-vertical">
                    <donation-total class="donation-total" />
                    <div class="pointer-icon">»</div>
                    <img
                        class="charity-logo"
                        src="../../assets/img/charity-logo-wide.png"
                    >
                </div>
            </div>
            <div class="bg-inset m-t-16" style="overflow: hidden; height: 80px">
                <omnibar-slide-rotation
                    :slide-title-width="150"
                    without-donation-reminder
                    without-schedule-items
                />
            </div>
            <div class="bg-inset m-t-16 layout vertical">
                <div class="layout horizontal center-vertical">
                    <div
                        class="host-name-display layout vertical center-vertical center-horizontal"
                        :class="{ speaking: hostSpeaking }"
                    >
                        <template v-if="currentHost == null">
                            No Host!
                        </template>
                        <template v-else>
                            <fitted-content
                                class="host-name"
                                align="center"
                            >
                                {{ currentHost.name }}
                            </fitted-content>
                            <div
                                class="layout horizontal center-horizontal center-vertical m-t-2 max-width"
                                style="padding: 0 4px;"
                            >
                                <country-flag
                                    v-if="currentHost.countryCode != null"
                                    :country-code="currentHost.countryCode"
                                    class="host-flag"
                                />
                                <fitted-content class="host-pronoun-wrapper">
                                    <badge
                                        v-if="!isBlank(currentHost.pronouns)"
                                        class="host-pronouns"
                                    >
                                        {{ currentHost.pronouns }}
                                    </badge>
                                </fitted-content>
                            </div>
                        </template>
                        <div class="host-name-label">H</div>
                    </div>
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
import FittedContent from 'components/FittedContent.vue';
import VfdPixelText from 'components/VfdPixelText.vue';
import { useTalentStore } from 'client-shared/stores/TalentStore';
import { isBlank } from 'client-shared/helpers/StringHelper';
import Badge from 'components/Badge.vue';
import CountryFlag from 'components/CountryFlag.vue';
import { useMusicStore } from 'client-shared/stores/MusicStore';
import { defaultSpeakingThreshold, disableVolumeMeters, useMixerStore } from 'client-shared/stores/MixerStore';
import { Configschema } from 'types/schemas';
import { useCurrentTrackerDataStore } from 'client-shared/stores/CurrentTrackerDataStore';

const currentTrackerDataStore = useCurrentTrackerDataStore();

const addVisualizerSpace = (nodecg.bundleConfig as Configschema).intermission?.addVisualizerSpace ?? false;
const addCameraSpace = (nodecg.bundleConfig as Configschema).intermission?.addCameraSpace ?? true;
const showPrizes = computed(() => currentTrackerDataStore.currentPrizes.length > 0);

provide(MaxOmnibarBidWarItemsInjectionKey, 3);
provide(MaxOmnibarBidWarTitleWidthInjectionKey, 200);

const talentStore = useTalentStore();
const musicStore = useMusicStore();
const mixerStore = useMixerStore();
const currentHost = computed(() => talentStore.findTalentItemById(talentStore.currentHostId));

const hostSpeaking = computed(() => {
    if (disableVolumeMeters || talentStore.currentHostId == null) return false;
    const assignment = mixerStore.talentMixerChannelAssignments.host;
    if (assignment == null) return false;
    return (mixerStore.mixerChannelLevels[assignment.channelId] ?? -90) > (assignment.speakingThresholdDB ?? defaultSpeakingThreshold);
});
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
    margin: 25px 60px 0;

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
    margin-top: 56px;
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
    height: 129px;
    margin: -8px 0;
}

.host-name-display {
    border: 2px solid colors.$vfd-teal;
    font-size: 30px;
    color: colors.$vfd-teal;
    font-weight: 700;
    position: relative;
    width: 250px;
    height: 73px;
    overflow: hidden;
    background-color: transparent;
    transition: background-color 150ms;

    &.speaking {
        background-color: color.adjust(colors.$vfd-teal, $alpha: -0.8);
    }

    > .host-name-label {
        font-family: 'Roboto Condensed', sans-serif;
        font-size: 20px;
        background-color: colors.$vfd-teal;
        color: colors.$vfd-background;
        position: absolute;
        bottom: 0;
        left: -2px;
        padding: 0 5px;
        min-width: 18px;
        height: 20px;
    }

    .host-name {
        padding: 0 4px;
        width: 100%;
        font-weight: 700;
    }

    .host-flag {
        height: 22px;
    }

    .host-flag + .host-pronoun-wrapper {
        margin-left: 4px;
    }

    .host-pronoun-wrapper {
        margin-top: -12px;
    }

    .host-pronouns {
        font-size: 16.25px !important;
        transform: translateY(1.5px);
    }
}

.music-icon {
    font-size: 40px;
    color: colors.$vfd-teal;
    margin: -4px 12px 0;
}
</style>
