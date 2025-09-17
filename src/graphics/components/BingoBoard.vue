<template>
    <div
        class="bingo-board__wrapper"
        :class="{
            'standalone-bingo': props.standalone,
            'multiple-teams': hasMultipleTeams
        }"
    >
        <div v-if="props.standalone || !hasMultipleTeams" class="bg-panel" />
        <div v-if="hasMultipleTeams" class="scores bg-timer">
            <div
                v-for="([color, score]) of scoreColorMap.entries()"
                class="bg-inset"
            >
                <seven-segment-digits
                    :digit-count="2"
                    :value="score"
                    :color="color"
                />
            </div>
        </div>
        <div class="bingo-board__aspect-ratio-square">
            <div
                class="bingo-board"
                :style="{
                    gridTemplateColumns: `repeat(${boardSize.width}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${boardSize.height}, minmax(0, 1fr))`
                }"
            >
                <template v-if="boardPresent">
                    <template v-for="row in boardWithColors">
                        <div
                            v-for="col in row"
                            :key="`cell_${col.id}`"
                            class="board-cell"
                            :style="{
                                fontSize: col.goal.length > 35 ? '0.75em' : '1em',
                                background: cellBackground(col.completedByColors)
                            }"
                            :class="{ completed: col.completedByPlayers.length > 0 }"
                        >
                            <span
                                :style="{ color: col.completedByColors.length === 1 ? getContrastingTextColor(col.completedByColors[0], '#fff', '#000') : undefined }"
                                :class="{ shadowed: col.completedByColors.length > 1 }"
                            >
                                {{ col.goal }}
                            </span>
                        </div>
                    </template>
                </template>
                <template v-else>
                    <div
                        v-for="n in 25"
                        class="board-cell"
                    >

                    </div>
                </template>
            </div>
        </div>
        <div v-if="props.standalone || !hasMultipleTeams" class="bg-panel" />
    </div>
</template>

<script setup lang="ts">
import { useBingoStore } from 'client-shared/stores/BingoStore';
import { computed } from 'vue';
import { getContrastingTextColor } from '@iplsplatoon/vue-components';
import SevenSegmentDigits from 'components/SevenSegmentDigits.vue';

const props = withDefaults(defineProps<{
    standalone?: boolean
}>(), {
    standalone: false
});

const bingoStore = useBingoStore();
const boardPresent = computed(() => bingoStore.bingoState.board.length > 0);

const boardWithColors = computed(() => bingoStore.bingoState.board.map(row => row.map(cell => {
    return ({
        ...cell,
        completedByColors: Array.from(new Set(cell.completedByPlayers
            .map(playerId => bingoStore.bingoState.players.find(player => player.id === playerId)?.color)
            .filter(color => color != null)
            .sort()))
    });
})));

const scoreColorMap = computed(() => {
    const result = new Map<string, number>();

    bingoStore.bingoState.players
        .filter(p => p.name !== nodecg.bundleName)
        .forEach(player => {
            result.set(player.color, 0);
        });

    boardWithColors.value.forEach(row => {
        row.forEach(cell => {
            cell.completedByColors.forEach(color => {
                if (result.has(color)) {
                    result.set(color, result.get(color)! + 1);
                } else {
                    result.set(color, 1);
                }
            });
        });
    });

    return result;
});

const hasMultipleTeams = computed(() => scoreColorMap.value.size > 1);

const cellBackground = (colors: string[]) => {
    if (colors.length === 0) {
        return 'transparent';
    } else if (colors.length === 1) {
        return colors[0];
    } else {
        return colors.reduce((result, color, i) => {
            result += `${color} ${(i / colors.length) * 100}%, ${color} ${((i + 1) / colors.length) * 100}%`;
            if (i !== colors.length - 1) {
                result += ', ';
            }
            return result;
        }, 'linear-gradient(to bottom, ') + ')';
    }
};

const boardSize = computed(() => {
    if (!boardPresent.value) {
        return { width: 5, height: 5 };
    } else {
        return {
            width: bingoStore.bingoState.board[0].length,
            height: bingoStore.bingoState.board.length
        };
    }
});
</script>

<style scoped lang="scss">
@use '../styles/colors';

.bingo-board__wrapper {
    display: grid;
    grid-template-columns: 1fr auto 1fr;

    &.multiple-teams {
        grid-template-columns: 1fr auto;
    }

    &.standalone-bingo {
        grid-template-columns: 1fr auto 1fr;
        gap: 3px;
        background-color: #000;

        &.multiple-teams {
            grid-template-columns: 1fr minmax(2em, 25%) auto 1fr;
        }
    }
}

.bingo-board__aspect-ratio-square {
    aspect-ratio: 1 / 1;
    background-color: #000;
    padding: 8px;
    height: 100%;
    position: relative;
}

.bingo-board {
    position: absolute;
    border: 0.1em solid colors.$vfd-teal;
    display: grid;
    height: calc(100% - 16px);
    width: calc(100% - 16px);
}

.board-cell {
    border: 0.1em solid colors.$vfd-teal;
    color: colors.$vfd-teal;
    overflow-wrap: anywhere;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25em;
    overflow: hidden;

    > .shadowed {
        filter: drop-shadow(0 0 2px #000) drop-shadow(0 0 1px #000);
        color: #fff;
    }
}

.scores {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    > * {
        padding: 0.1em 0.25em;
        font-size: 3em;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        position: relative;
        //border-style: solid;
        //border-width: 0.05em;
        border-width: 0.1em;

        &:not(:last-child) {
            margin-bottom: 0.5em;
        }
    }
}
</style>
