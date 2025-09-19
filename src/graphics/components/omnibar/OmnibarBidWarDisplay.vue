<template>
    <div class="omnibar-bid-war-display layout horizontal">
        <div
            class="bid-war-title layout vertical center-vertical m-r-16"
            :style="{ maxWidth: `${maxTitleWidth}px` }"
        >
            <fitted-content>
                {{ props.bidWar.speedrunName }}
            </fitted-content>
            <fitted-content>
                {{ props.bidWar.name }}
            </fitted-content>
        </div>
        <div
            v-if="props.bidWar.options?.length === 0 && props.bidWar.userOptionsAllowed"
            class="no-options-message layout horizontal center-vertical center-horizontal"
        >
            <fitted-content>
                <span>No options submitted. Donate now to add your own!</span>
            </fitted-content>
        </div>
        <div
            v-else-if="props.bidWar.options?.length === 2 && !props.bidWar.userOptionsAllowed"
            class="bid-war-duel-options layout horizontal m-r-8"
        >
            <div
                v-for="option in props.bidWar.options"
                class="bid-war-duel-option"
                :class="{ 'is-winning': highestOptionTotal !== 0 && option.total === highestOptionTotal }"
            >
                <div class="option-numbers">
                    <div
                        class="percentage"
                        :style="{ transform: Math.round((option.total / props.bidWar.total) * 100) === 100 ? 'scaleX(0.85)' : undefined }"
                    >
                        {{ props.bidWar.total === 0 ? 0 : Math.round((option.total / props.bidWar.total) * 100) }}%
                    </div>
                    <div class="total">{{ formatCurrencyAmount(option.total) }}</div>
                </div>
                <fitted-content align="center" class="option-name">{{ option.name }}</fitted-content>
            </div>
        </div>
        <div
            v-else-if="(props.bidWar.options?.length ?? 0) > 0"
            class="bid-war-options grow"
            :style="{ gridTemplateColumns: `repeat(${maxOptions}, minmax(0, 1fr)) ${(props.bidWar.options?.length ?? 0) > maxOptions ? '55px' : ''}` }"
        >
            <div
                v-for="option in props.bidWar.options?.slice(0, maxOptions)"
                class="bid-war-option"
                :class="{ 'is-winning': highestOptionTotal !== 0 && option.total === highestOptionTotal }"
            >
                <fitted-content class="option-name">
                    {{ option.name }}
                </fitted-content>
                <div class="option-total">{{ formatCurrencyAmount(option.total) }}</div>
            </div>
            <div
                v-if="(props.bidWar.options?.length ?? 0) > maxOptions"
                class="extra-option-box"
            >
                <div class="extra-option-count">+{{ props.bidWar.options!.length - maxOptions }}</div>
            </div>
            <div
                v-else-if="(props.bidWar.options?.length ?? 0) <= maxOptions - 1 && props.bidWar.userOptionsAllowed"
                class="no-options-message"
                :style="{ gridColumn: `span ${Math.min(maxOptions - (props.bidWar.options?.length ?? 0), 2)}` }"
            >
                <fitted-content align="center">
                    <span>{{ props.bidWar.options?.length === 0 ? 'No options submitted. Donate now to add your own!' : 'Submissions open!' }}</span>
                </fitted-content>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { CurrentBids } from 'types/schemas';
import { formatCurrencyAmount } from 'client-shared/helpers/StringHelper';
import FittedContent from 'components/FittedContent.vue';
import { computed, inject } from 'vue';
import {
    MaxOmnibarBidWarItemsInjectionKey,
    MaxOmnibarBidWarTitleWidthInjectionKey
} from '../../../dashboard/helpers/Injections';

const props = defineProps<{
    bidWar: CurrentBids[number]
}>();

const highestOptionTotal = computed(() => Math.max(...(props.bidWar.options?.map(option => option.total) ?? [])));

const maxOptions = inject(MaxOmnibarBidWarItemsInjectionKey, 4);
const maxTitleWidth = inject(MaxOmnibarBidWarTitleWidthInjectionKey, 275);
</script>

<style scoped lang="scss">
@use '../../styles/colors';

.omnibar-bid-war-display {
    width: 100%;
    height: 58px;
}

.bid-war-title {
    color: colors.$vfd-teal;
    font-size: 25px;
    font-weight: 700;
}

.no-options-message {
    font-size: 25px;
    color: colors.$vfd-teal;
    font-weight: 700;
    overflow: hidden;
    width: 100%;
    grid-column: span 2;
    line-height: 43px;

    > * {
        border: 2px solid colors.$vfd-teal;
        padding: 6px 16px;
        height: 100%;
    }
}

.bid-war-option, .bid-war-duel-option {
    --option-color: #{colors.$vfd-teal};

    border: 2px solid var(--option-color);
    color: var(--option-color);

    &.is-winning {
        --option-color: #FF5959;
    }
}

.bid-war-duel-options {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    overflow: hidden;
    width: 100%;
}

.bid-war-duel-option {
    display: flex;
    align-items: center;

    &:last-child {
        flex-direction: row-reverse;

        .option-numbers {
            padding-left: 6px;
            padding-right: 4px;
        }
    }

    .option-name {
        width: 100%;
        font-size: 25px;
        font-weight: 700;
        margin: 0 4px;
    }

    .option-numbers {
        background-color: var(--option-color);
        color: colors.$vfd-background;
        min-width: 54px;
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;
        padding-right: 6px;
        padding-left: 4px;
        height: 100%;
        white-space: nowrap;

        .percentage {
            font-weight: 700;
            font-size: 25px;
        }

        .total {
            font-family: 'Roboto Condensed', sans-serif;
            font-size: 18px;
            margin-top: -4px;
        }
    }
}

.bid-war-options {
    display: grid;
}

.bid-war-option {
    margin-right: 4px;
    font-size: 20px;
    font-weight: 700;
    position: relative;

    .option-name {
        margin: 6px 4px 0;
    }

    .option-total {
        position: absolute;
        bottom: -2px;
        left: -2px;
        background-color: var(--option-color);
        color: colors.$vfd-background;
        font-family: 'Roboto Condensed', sans-serif;
        font-size: 18px;
        padding: 0 4px;
    }
}

.extra-option-box {
    background-color: colors.$vfd-teal;
    color: colors.$vfd-background;
    text-align: center;
    padding: 0 8px;
    font-weight: 700;

    .extra-option-count {
        font-size: 32px;
        margin-top: 10px;
    }
}
</style>
