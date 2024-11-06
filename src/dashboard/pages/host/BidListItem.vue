<template>
    <ipl-space color="secondary">
        <div
            style="float: right"
            :class="{ 'goal-met': props.bid.goal != null && props.bid.total >= props.bid.goal }"
        >
            <template v-if="props.bid.goal != null">
                {{ formatCurrencyAmount(props.bid.total) }}/{{ formatCurrencyAmount(props.bid.goal) }}
            </template>
            <template v-else>
                {{ formatCurrencyAmount(props.bid.total) }}
            </template>
        </div>
        <ipl-badge
            v-if="props.bid.pinned"
            :color="colors.activeSpeedrun"
            class="pinned-bid-badge m-b-2"
        >
            <font-awesome-icon icon="thumbtack" size="xs" />
            Pinned
        </ipl-badge>
        <div class="bid-name">{{ props.bid.name }}</div>
        <div class="m-t-2">{{ props.bid.description }}</div>
        <div v-if="!$helpers.isBlank(props.bid.speedrunName)" class="m-t-4 m-b-2"><span class="text-bold">Game: </span>{{ props.bid.speedrunName }}</div>
        <div class="m-t-4 m-b-2" :style="{ color: endTimeColor ?? undefined }">{{ endTimeText }}</div>
        <ipl-expanding-space
            v-if="props.bid.options != null"
            title="Options"
            class="m-t-4"
        >
            <div
                v-if="props.bid.userOptionsAllowed"
                class="m-b-8"
            >
                <font-awesome-icon icon="circle-info" size="sm" />
                User-submitted options are allowed!
            </div>
            <div
                v-for="option in props.bid.options"
                :key="option.id"
                class="m-t-2"
            >
                <div style="float: right">{{ formatCurrencyAmount(option.total) }} ({{ props.bid.total === 0 ? 0 : Math.round((option.total / props.bid.total) * 100) }}%)</div>
                <div>{{ option.name }}</div>
                <div>{{ option.description }}</div>
            </div>
        </ipl-expanding-space>
    </ipl-space>
</template>

<script setup lang="ts">
import { AllBids } from 'types/schemas';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { DateTime } from 'luxon';
import { IplBadge, IplExpandingSpace, IplSpace } from '@iplsplatoon/vue-components';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons/faCircleInfo';
import { faThumbtack } from '@fortawesome/free-solid-svg-icons/faThumbtack';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { formatCurrencyAmount } from 'client-shared/helpers/StringHelper';
import { colors } from '../../styles/colors';

library.add(faCircleInfo, faThumbtack);

const props = defineProps<{
    bid: AllBids[number]
}>();

const parsedSpeedrunEndTime = computed(() => {
    if (props.bid.speedrunEndTime == null) {
        return null;
    }
    const result = DateTime.fromISO(props.bid.speedrunEndTime);
    if (!result.isValid) {
        return null;
    } else {
        return result;
    }
});

const endTimeText = ref<string | null>(null);
const endTimeColor = ref<string | null>(null);
function updateEndTimeInfo() {
    if (parsedSpeedrunEndTime.value == null) {
        endTimeText.value = null;
        endTimeColor.value = null;
        return;
    }
    const diffNow = parsedSpeedrunEndTime.value.diffNow(['hours']);
    const relativeDate = parsedSpeedrunEndTime.value.toRelative({ locale: 'en-US' });
    endTimeText.value = diffNow.hours > 0 ? `Ends ${relativeDate}` : `Ended ${relativeDate}`;
    endTimeColor.value = diffNow.hours > 1 || diffNow.hours < 0 ? null : colors.stateRed;
}

let endTimeUpdateInterval: number | undefined = undefined;
onMounted(() => {
    endTimeUpdateInterval = window.setInterval(() => {
        updateEndTimeInfo();
    }, 60 * 1000);
});
onUnmounted(() => {
    window.clearInterval(endTimeUpdateInterval);
});
watch(parsedSpeedrunEndTime, updateEndTimeInfo, { immediate: true });
</script>

<style scoped lang="scss">
@use '../../styles/dashboard-colors';

.goal-met {
    color: dashboard-colors.$state-green;
}

.bid-name {
    font-weight: 700;
    font-size: 1.25em;
}

.options-title {
    font-weight: 600;
    margin-top: 8px;
}
</style>
