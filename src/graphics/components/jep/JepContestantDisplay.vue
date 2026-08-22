<template>
    <div
        class="contestant bg-panel"
        :class="{ focused: jepStore.focusedContestantIndex === props.contestantIndex }"
    >
        <div class="bg-inset layout horizontal center-vertical">
            <div class="layout horizontal center-vertical max-height">
                <div class="contestant-index">{{ props.contestantIndex + 1 }}</div>
                <div
                    class="contestant-symbol"
                    :style="{ backgroundImage: `url('${props.contestant.symbolUrl}')` }"
                />
            </div>
            <seven-segment-digits
                :digit-count="7"
                :value="props.contestant.score"
                class="contestant-score"
                :color="props.contestant.score < 0 ? 'red' : 'teal'"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import SevenSegmentDigits from 'components/SevenSegmentDigits.vue';
import { useJepStore } from 'client-shared/stores/JepStore';
import { JepContestants } from 'types/schemas/jepContestants';

const props = defineProps<{
    contestant: JepContestants[number]
    contestantIndex: number
}>();

const jepStore = useJepStore();
</script>

<style scoped lang="scss">
@use '../../styles/colors';

.contestant {
    padding: 8px;

    &.focused {
        > * {
            box-shadow: inset 0 0 32px colors.$vfd-red;
        }

        .contestant-index {
            background-color: colors.$vfd-red;
        }
    }

    > * {
        height: 100%;
        width: 100%;
        justify-content: space-between;
        padding: 8px 24px;
        transition: box-shadow 200ms;
    }

    .contestant-symbol {
        height: 100%;
        aspect-ratio: 3 / 2;
        background-size: contain;
        background-position: center;
        background-repeat: no-repeat;
    }

    .contestant-index {
        font-size: 50px;
        color: colors.$vfd-background;
        background-color: colors.$vfd-teal;
        width: 55px;
        height: 55px;
        text-align: center;
        line-height: 57px;
        font-weight: 700;
        margin-right: 24px;
        transition: background-color 200ms;
    }

    .contestant-score {
        font-size: 50px;

        :deep(> *) {
            transition: color 200ms;
        }
    }
}
</style>
