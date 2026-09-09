<template>
    <div class="donation-total layout horizontal end-vertical">
        <div>
            <div
                v-if="props.showConvertedCurrency"
                class="approximate-label"
                :class="{ lit: showOtherCurrency }"
            >
                APPROX.
            </div>
            <seven-segment-digits
                :digit-count="6"
                class="donation-total-digits"
                :value="showOtherCurrency ? tweenedConvertedTotal : tweenedTotal"
            />
        </div>
        <div class="currency-label">
            <div :class="{ lit: showOtherCurrency }">{{ OTHER_CURRENCY_LABEL }}</div>
            <div :class="{ lit: !showOtherCurrency }">{{ CURRENCY_CODE }}</div>
        </div>
    </div>
</template>

<script setup lang="ts">
import SevenSegmentDigits from 'components/SevenSegmentDigits.vue';
import { useTweenedNumber } from '../helpers/useTweenedNumber';
import { useDonationStore } from 'client-shared/stores/DonationStore';
import { CURRENCY_CODE, CURRENCY_CONVERSION_ENABLED, OTHER_CURRENCY_LABEL } from 'client-shared/helpers/StringHelper';
import { onUnmounted, ref } from 'vue';

const props = defineProps<{
    showConvertedCurrency?: boolean
}>();

const donationStore = useDonationStore();

const showOtherCurrency = ref(false);

let currencySwitchInterval: number | undefined = undefined;
if (CURRENCY_CONVERSION_ENABLED && props.showConvertedCurrency) {
    currencySwitchInterval = window.setInterval(() => {
        if (donationStore.currencyConversionRate == null) {
            showOtherCurrency.value = false;
        } else {
            showOtherCurrency.value = !showOtherCurrency.value;
        }
    }, 30 * 1000);
}

onUnmounted(() => {
    window.clearInterval(currencySwitchInterval);
});

// assumes that props.showConvertedCurrency never changes.
const tweenedConvertedTotal = useTweenedNumber(CURRENCY_CONVERSION_ENABLED && props.showConvertedCurrency ? (() => donationStore.convertedTotal ?? 0) : (() => 0));
const tweenedTotal = useTweenedNumber(() => Math.floor(donationStore.donationTotal));
</script>

<style scoped lang="scss">
@use '../styles/colors';

.donation-total {
    margin-top: -3px;
}

.donation-total-digits {
    font-size: 2em;
    margin-right: 4px;
}

.approximate-label {
    color: colors.$vfd-teal-unlit;
    font-weight: 500;
    margin-left: 4px;
    font-size: 0.8em;
    line-height: 20px;
    margin-top: -2px;
    transition: color 100ms;

    &.lit {
        color: colors.$vfd-teal;
    }
}

.currency-label {
    font-size: 1.25em;
    font-weight: 700;
    line-height: 0.9em;

    > * {
        transition: color 100ms;
        color: colors.$vfd-red-unlit;

        &.lit {
            color: colors.$vfd-red;
        }

        &:last-child {
            margin-bottom: -2px;
        }
    }
}
</style>
