<template>
    <div class="prize-display bg-inset">
        <div class="layout horizontal center-vertical center-horizontal max-height">
            <opacity-swap-transition mode="default">
                <div
                    v-if="activePrize != null"
                    :key="activePrize?.id"
                    class="layout horizontal max-height center-horizontal max-width"
                >
                    <div
                        class="prize-image"
                        :style="{ backgroundImage: `url('${useBackupImageForSlide[activePrize.id] === true ? prizeImagePlaceholder : activePrize.image}')` }"
                    />
                    <div class="layout vertical center-vertical prize-details">
                        <div class="prize-label">Prize</div>
                        <fitted-content class="prize-name">{{ activePrize.name }}</fitted-content>
                        <div v-if="activePrize.provider" class="provider">Provided by {{ activePrize.provider }}</div>
                        <div class="layout horizontal prize-donation-amount">
                            <seven-segment-digits
                                :digit-count="Math.max(3, String(Math.floor(activePrize.minimumBid)).length)"
                                :value="Math.floor(activePrize.minimumBid)"
                                class="prize-donation-amount-digits"
                            />
                            <div class="currency-label">
                                <div class="unlit">USD</div>
                                <div>{{ CURRENCY_CODE }}</div>
                            </div>
                            <div class="donation-type">
                                <template v-if="activePrize.sumDonations">
                                    <div class="unlit">Minimum Donation</div>
                                    <div>Cumulative Donations</div>
                                </template>
                                <template v-else>
                                    <div class="unlit">Cumulative Donations</div>
                                    <div>Minimum Donation</div>
                                </template>
                            </div>
                        </div>
                    </div>
                </div>
            </opacity-swap-transition>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useCurrentTrackerDataStore } from 'client-shared/stores/CurrentTrackerDataStore';
import { useSlides } from '../../helpers/useSlides';
import { loadAndCheckIfImageExists } from '../../helpers/ImageHelper';
import { computed, ref } from 'vue';
import prizeImagePlaceholder from '../../assets/img/prize-image-placeholder.png';
import SevenSegmentDigits from 'components/SevenSegmentDigits.vue';
import OpacitySwapTransition from 'components/OpacitySwapTransition.vue';
import FittedContent from 'components/FittedContent.vue';
import { CURRENCY_CODE } from 'client-shared/helpers/StringHelper';

const currentTrackerDataStore = useCurrentTrackerDataStore();

const useBackupImageForSlide = ref<Record<number, boolean>>({});
const prizeSlides = useSlides(() => currentTrackerDataStore.currentPrizes.map((prize, i) => ({
    component: String(i),
    duration: 30,
    beforeChange: async () => {
        if (prize.image) {
            if (!await loadAndCheckIfImageExists(prize.image)) {
                useBackupImageForSlide.value[prize.id] = true;
            }
        } else {
            await loadAndCheckIfImageExists(prizeImagePlaceholder);
            useBackupImageForSlide.value[prize.id] = true;
        }
    }
})));
const activePrize = computed(() => prizeSlides.activeComponent.value == null ? null : currentTrackerDataStore.currentPrizes[Number(prizeSlides.activeComponent.value)]);
</script>

<style scoped lang="scss">
@use '../../styles/colors';

.prize-display {
    overflow: hidden;

    > div {
        position: relative;
    }
}

.prize-image {
    height: 100%;
    min-width: 260px;
    margin: 0 16px;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
}

.prize-details {
    align-items: flex-start;
    color: colors.$vfd-teal;
    flex-shrink: 1;
    width: 100%;
    overflow: hidden;
}

.prize-label {
    color: colors.$vfd-background;
    background-color: colors.$vfd-red;
    padding: 2px 16px;
    font-size: 25px;
    font-weight: 700;
    text-transform: uppercase;
    margin-bottom: 8px;
}

.prize-name {
    font-weight: 700;
    font-size: 50px;
    overflow: hidden;
    width: 100%;
}

.provider {
    margin-top: 6px;
    margin-right: 12px;
    font-size: 26px;
    font-weight: 600;
}

.prize-donation-amount {
    align-items: flex-end;
    margin-top: 12px;

    .currency-label {
        font-size: 24px;
        font-weight: 700;
        color: colors.$vfd-red;
        line-height: 24px;
        margin-bottom: -3px;
        margin-left: 2px;

        > .unlit {
            color: colors.$vfd-red-unlit;
        }
    }
}

.prize-donation-amount-digits {
    font-size: 45px;
}

.donation-type {
    font-size: 24px;
    font-weight: 700;
    line-height: 24px;
    margin-bottom: -3px;
    margin-left: 8px;
    text-transform: uppercase;

    > .unlit {
        color: colors.$vfd-teal-unlit;
    }
}
</style>
