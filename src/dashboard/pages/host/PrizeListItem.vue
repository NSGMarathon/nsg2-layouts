<template>
    <ipl-space color="secondary">
        <div class="prize-name">{{ props.prize.name }}</div>
        <div>{{ availability }}</div>
        <div>{{ formatCurrencyAmount(props.prize.minimumBid) }} {{ props.prize.sumDonations ? 'total donations' : 'minimum donation' }}</div>
    </ipl-space>
</template>

<script setup lang="ts">
import { getPrizeRelativeAvailability } from 'client-shared/helpers/PrizeHelper';
import { formatCurrencyAmount } from 'client-shared/helpers/StringHelper';
import { IplSpace } from '@iplsplatoon/vue-components';
import { AllPrizes } from 'types/schemas';
import { onMounted, onUnmounted, ref, watch } from 'vue';

const props = defineProps<{
    prize: AllPrizes[number]
}>();

const availability = ref('');
function refreshAvailability() {
    availability.value = getPrizeRelativeAvailability(props.prize);
}

let availabilityRefreshInterval: number | undefined = undefined;
onMounted(() => {
    refreshAvailability();
    availabilityRefreshInterval = window.setInterval(() => {
        refreshAvailability();
    }, 60 * 1000);
});
onUnmounted(() => {
    window.clearInterval(availabilityRefreshInterval);
});
watch(() => props.prize, refreshAvailability);
</script>

<style scoped lang="scss">
.prize-name {
    font-size: 1.25em;
    font-weight: 700;
}
</style>
