<template>
    <ipl-expanding-space title="Milestones">
        <div class="layout horizontal center-horizontal">
            <ipl-checkbox
                v-model="showCompleted"
                small
                label="Show completed milestones"
            />
            <ipl-checkbox
                v-model="showFuture"
                small
                label="Show future milestones"
                class="m-l-8"
            />
        </div>
        <ipl-space
            v-for="milestone in visibleMilestones"
            :key="milestone.id"
            color="secondary"
            class="m-t-8"
        >
            <div
                class="milestone-name"
                :class="{
                    'is-completed': milestone.amount <= donationStore.donationTotal,
                    'is-future': milestone.start > donationStore.donationTotal
                }"
            >
                {{ milestone.name }}
            </div>
            <div class="m-y-2">{{ milestone.description || milestone.shortDescription }}</div>
            <div>{{ formatCurrencyAmount(milestone.amount) }}; starts at {{ formatCurrencyAmount(milestone.start) }}</div>
        </ipl-space>
    </ipl-expanding-space>
</template>

<script setup lang="ts">
import { IplCheckbox, IplExpandingSpace, IplSpace } from '@iplsplatoon/vue-components';
import { useAllTrackerDataStore } from 'client-shared/stores/AllTrackerDataStore';
import { computed, ref } from 'vue';
import { useDonationStore } from 'client-shared/stores/DonationStore';
import { formatCurrencyAmount } from 'client-shared/helpers/StringHelper';

const donationStore = useDonationStore();
const allTrackerDataStore = useAllTrackerDataStore();
const showCompleted = ref(false);
const showFuture = ref(false);
const visibleMilestones = computed(() => {
    if (showCompleted.value && showFuture.value) return allTrackerDataStore.milestones;
    return allTrackerDataStore.milestones.filter(milestone =>
        (showCompleted.value || milestone.amount > donationStore.donationTotal)
        && (showFuture.value || milestone.start <= donationStore.donationTotal));
});
</script>

<style scoped lang="scss">
@use '../../styles/dashboard-colors';

.milestone-name {
    font-size: 1.25em;
    font-weight: 700;
}

.is-completed {
    color: dashboard-colors.$state-green;
}

.is-future {
    color: dashboard-colors.$state-yellow;
}
</style>
