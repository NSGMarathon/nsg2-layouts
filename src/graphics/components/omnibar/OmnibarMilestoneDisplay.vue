<template>
    <div class="omnibar-milestone-display">
        <div class="first-row">
            <fitted-content class="milestone-name m-r-8">
                {{ props.milestone.name }}
            </fitted-content>
            <div>{{ formatCurrencyAmount(donationStore.donationTotal, false, false) }}/<span class="milestone-total">{{ formatCurrencyAmount(props.milestone.amount) }}</span></div>
        </div>
        <vfd-pixel-text
            :font-size="24"
            text-align="left"
            :progress-bar="{ current: donationStore.donationTotal, start: props.milestone.start, end: props.milestone.amount, showStartEnd: true }"
        />
    </div>
</template>

<script setup lang="ts">
import VfdPixelText from 'components/VfdPixelText.vue';
import { Milestones } from 'types/schemas';
import { formatCurrencyAmount } from 'client-shared/helpers/StringHelper';
import { useDonationStore } from 'client-shared/stores/DonationStore';
import FittedContent from 'components/FittedContent.vue';

const donationStore = useDonationStore();

const props = defineProps<{
    milestone: Milestones[number]
}>();
</script>

<style scoped lang="scss">
@use '../../styles/colors';

.omnibar-milestone-display {
    width: 98%;
}

.first-row {
    width: 100%;
    display: flex;
    justify-content: space-between;
    color: colors.$vfd-teal;
    font-size: 25px;
}

.milestone-total, .milestone-name {
    font-weight: 700;
}
</style>
