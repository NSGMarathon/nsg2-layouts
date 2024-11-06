<template>
    <div class="omnibar-milestone-display">
        <div class="first-row">
            <fitted-content class="incentive-name m-r-8">
                <span v-if="!$helpers.isBlank(props.incentive.speedrunName)" class="speedrun-name">{{ props.incentive.speedrunName }} - </span>{{ props.incentive.name }}
            </fitted-content>
            <div>{{ formatCurrencyAmount(props.incentive.total, false, false) }}/<span class="incentive-total">{{ props.incentive.goal == null ? '-' : formatCurrencyAmount(props.incentive.goal) }}</span></div>
        </div>
        <vfd-pixel-text
            :font-size="24"
            text-align="left"
            :progress-bar="{ current: props.incentive.total, start: 0, end: props.incentive.goal ?? 0, showStartEnd: false }"
        />
    </div>
</template>

<script setup lang="ts">
import VfdPixelText from 'components/VfdPixelText.vue';
import { CurrentBids } from 'types/schemas';
import { formatCurrencyAmount } from 'client-shared/helpers/StringHelper';
import FittedContent from 'components/FittedContent.vue';

const props = defineProps<{
    incentive: CurrentBids[number]
}>();
</script>

<style scoped lang="scss">
@use '../../styles/colors';

.speedrun-name {
    font-weight: 400;
}

.omnibar-milestone-display {
    width: 98%;
}

.first-row {
    width: 100%;
    display: flex;
    justify-content: space-between;
    color: colors.$vfd-teal;
    font-size: 25px;
    white-space: nowrap;
}

.incentive-total, .incentive-name {
    font-weight: 700;
}
</style>
