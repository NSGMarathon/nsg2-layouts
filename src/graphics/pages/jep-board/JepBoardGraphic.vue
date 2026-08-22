<template>
    <div
        class="jep-board-wrapper"
        :class="{ 'stage': isStageVariant, 'live': !isStageVariant }"
    >
        <div
            class="board-with-border"
            ref="boardElem"
        >
            <div class="bg-timer side-panel-x" style="margin-right: 0" />
            <div class="bg-timer" style="margin-bottom: 0" />
            <div class="bg-timer side-panel-x" style="margin-left: 0" />
            <table
                class="jep-board"
                :class="{
                    // if the underlay isn't hidden after the game starts, it'll sort of 'peek through' the game board as it zooms in and out
                    'with-underlay':
                        jepStore.jepState.state === 'STARTING_NEXT_ROUND' ||
                        jepStore.jepState.state === 'REVEALING_CATEGORIES' ||
                        jepStore.jepState.state === 'WAITING_FOR_CONTESTANT_INFO',
                    'play-intro': (jepStore.jepState.state === 'REVEALING_CATEGORIES' || jepStore.jepState.state === 'STARTING_NEXT_ROUND') && jepStore.jepBoard.round === 'JEOPARDY'
                }"
                :style="{
                    '--row-height': `${100 / (JEP_CLUES_PER_CATEGORY + 1)}%`,
                    '--column-width': `${100 / JEP_CATEGORY_COUNT}%`
                }"
            >
                <tr>
                    <th
                        v-for="(category, i) of boardContent.heading"
                        class="category-name bg-board-panel"
                        :data-category-index="i"
                        :class="{ 'smaller': (category?.name.length ?? 0) >= 18 }"
                    >
                        <span
                            :style="{
                                opacity: !category?.allCluesAnswered &&
                                    jepStore.jepState.state !== 'STARTING_NEXT_ROUND' &&
                                    jepStore.jepState.state !== 'WAITING_FOR_CONTESTANT_INFO' &&
                                    (jepStore.jepState.state !== 'REVEALING_CATEGORIES' || jepStore.jepState.lastRevealedCategoryIndex >= i)
                                    ? '1'
                                    : '0'
                            }"
                        >
                            {{ category?.name }}
                        </span>
                    </th>
                </tr>
                <tr v-for="(tileRow, j) of boardContent.tiles">
                    <td
                        v-for="(tile, i) of tileRow"
                        :class="{
                            active:
                                (jepStore.selectedClue != null && jepStore.selectedClue.position[0] === i && jepStore.selectedClue.position[1] === j) ||
                                (jepStore.jepBoard.round === 'FINAL_JEOPARDY' && tile.type === 'clue' && !tile.answered),
                            [tile.type]: true,
                            'final-jep-category-name': tile.type === 'category-name',
                             'bg-board-panel': tile.type === 'category-name',
                             'is-daily-double-clue': tile.type === 'clue' && tile.isDailyDouble
                        }"
                        :style="{ opacity: tile.type === 'none' ? '0' : '1' }"
                    >
                        <template v-if="tile.type === 'clue'">
                            <div
                                class="clue-prompt layout horizontal center-horizontal center-vertical"
                                :class="{ 'smaller': tile.prompt.length >= 90 }"
                            >
                                <span>
                                    {{ tile.prompt }}
                                </span>
                            </div>
                            <div
                                v-if="tile.isDailyDouble"
                                v-show="jepStore.jepState.state === 'DAILY_DOUBLE_AWAITING_WAGER'"
                                class="daily-double-cover"
                            />
                            <div class="clue-cover bg-board-panel layout horizontal center-horizontal center-vertical">
                                <span v-show="!tile.answered && jepStore.jepBoard.round !== 'FINAL_JEOPARDY'">
                                    {{ jepStore.getClueValue(j) }}
                                </span>
                            </div>
                        </template>
                        <span
                            v-else-if="tile.type === 'category-name'"
                            :style="{
                                opacity: jepStore.jepState.state !== 'STARTING_NEXT_ROUND' && jepStore.jepState.state !== 'REVEALING_CATEGORIES' ? '1' : '0'
                            }"
                        >
                            {{ tile.name }}
                        </span>
                    </td>
                </tr>
            </table>
            <div class="bg-timer" style="margin-top: 0" />
        </div>
        <div
            v-if="isStageVariant"
            class="contestant-info"
        >
            <div
                v-for="(contestant, i) of jepStore.jepContestants"
                class="contestant bg-panel"
                :class="{ focused: jepStore.focusedContestantIndex === i }"
            >
                <div class="bg-inset layout horizontal center-horizontal center-vertical">
                    <div class="layout horizontal center-vertical max-height">
                        <div class="contestant-index">{{ i + 1 }}</div>
                        <div
                            class="contestant-symbol"
                            :style="{ backgroundImage: `url('${contestant.symbolUrl}')` }"
                        />
                    </div>
                    <seven-segment-digits
                        :digit-count="7"
                        :value="contestant.score"
                        class="contestant-score"
                        :color="contestant.score < 0 ? 'red' : 'teal'"
                    />
                </div>
            </div>
            <div
                v-if="jepStore.jepContestants.length === 0"
                class="contestant bg-panel"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { useJepStore } from 'client-shared/stores/JepStore';
import SevenSegmentDigits from 'components/SevenSegmentDigits.vue';
import { JEP_CATEGORY_COUNT, JEP_CLUES_PER_CATEGORY } from 'shared/JepConstants';
import { computed, onMounted, useTemplateRef, watch } from 'vue';
import gsap from 'gsap';
import { JepBoard } from 'types/schemas/jepBoard';

// please note that this graphic was intended for a single segment and therefore might not be held up to the same
// standards of quality as other parts of this repository :)

// todo: enabled buzzer indicator

const params = new URLSearchParams(window.location.search);
const isStageVariant = params.has('stage') && params.get('stage') !== 'false';

const jepStore = useJepStore();

const boardElem = useTemplateRef('boardElem');

type BoardContentTile = ({ type: 'none' } | ({ type: 'clue' } & JepBoard['categories'][number]['clues'][number]) | { type: 'category-name', name: string });

const boardContent = computed<{ heading: ({ name: string, allCluesAnswered: boolean } | null)[], tiles: BoardContentTile[][] }>(() => {
    if (jepStore.jepBoard.round === 'FINAL_JEOPARDY') {
        const result = {
            heading: Array.from({ length: JEP_CATEGORY_COUNT }, () => ({ name: '', allCluesAnswered: true })),
            tiles: Array.from(
                { length: JEP_CLUES_PER_CATEGORY },
                () => Array.from({ length: JEP_CATEGORY_COUNT }, () => ({
                    type: 'clue',
                    prompt: '',
                    answer: '',
                    answered: true
                }))) as BoardContentTile[][]
        };

        result.tiles[2][3] = { type: 'category-name', name: jepStore.jepBoard.categories[0].name };

        if (jepStore.jepState.state !== 'STARTING_NEXT_ROUND' && jepStore.jepState.state !== 'REVEALING_CATEGORIES' && jepStore.jepState.state !== 'FINAL_JEP_AWAITING_WAGERS') {
            result.tiles[3][3] = { type: 'clue', ...jepStore.jepBoard.categories[0].clues[0] };
        }

        return result;
    } if (jepStore.jepBoard.round !== 'JEOPARDY' && jepStore.jepBoard.round !== 'DOUBLE_JEOPARDY') {
        return {
            heading: Array.from({ length: JEP_CATEGORY_COUNT }, () => null),
            tiles: Array.from(
                { length: JEP_CLUES_PER_CATEGORY },
                () => Array.from({ length: JEP_CATEGORY_COUNT }, () => ({ type: 'none' })))
        };
    }

    return {
        heading: Array.from({ length: JEP_CATEGORY_COUNT }, (_, i) => {
            const cat = jepStore.jepBoard.categories[i];

            return {
                name: cat.name,
                allCluesAnswered: cat.clues.every((clue) => clue.answered)
            };
        }),
        tiles: Array.from(
            { length: JEP_CLUES_PER_CATEGORY },
            (_, i) => Array.from({ length: JEP_CATEGORY_COUNT }, (_, j) => ({ ...jepStore.jepBoard.categories[j].clues[i], type: 'clue' })))
    };
});

onMounted(() => {
    const boardTl = gsap.timeline();

    function focusOnBoardTile(el: HTMLElement, xGridPosition: number, duration = 1.5, ease: gsap.EaseString = 'expo.inOut') {
        const op = el.offsetParent as HTMLElement;
        const width = el.offsetWidth;
        const x = ((op.offsetLeft + el.offsetLeft) * -1) - (xGridPosition % 2 === 0 ? 2 : 1.5);
        const y = ((op.offsetTop + el.offsetTop) * -1) - 2.5;

        // css transitions aren't smart enough for this one, unfortunately
        // doing all this with css transforms is only kinda-sorta precise, but it definitely runs into some sort of
        // rounding errors or w/e it might be if you start pixel-peeping. i'm deeming it ok for this show
        const scale = document.body.offsetWidth / width;
        boardTl
            .to(boardElem.value, {
                transform: `scale(${scale}) translate3d(${x}px, ${y}px, 0)`,
                ease,
                duration
            });
    }

    function focusOffBoardTile() {
        boardTl
            .to(boardElem.value, {
                transform: 'scale(1) translate3d(0px, 0px, 0)',
                ease: 'expo.inOut',
                duration: 1.5
            });
    }

    // board movements during Final Jeopardy
    watch(() => jepStore.jepBoard.round === 'FINAL_JEOPARDY' ? jepStore.jepState.state : null, (newValue, oldValue) => {
        if (newValue == null || newValue === oldValue || newValue === 'REVEALING_CATEGORIES' || newValue === 'STARTING_NEXT_ROUND') {
            return;
        }

        if (newValue === 'VIEW_FINAL_RESULT' || newValue === 'WAITING_FOR_CONTESTANT_INFO') {
            focusOffBoardTile();
        } else {
            let selector;
            if (jepStore.jepState.state === 'FINAL_JEP_AWAITING_WAGERS') {
                selector = '.final-jep-category-name';
            } else {
                selector = '.clue.active';
            }

            focusOnBoardTile(
                boardElem.value!.querySelector(selector) as HTMLElement,
                3,
                selector === '.final-jep-category-name' ? 1.5 : 1,
                selector === '.final-jep-category-name' ? 'expo.inOut' : 'power2.inOut'
            )
        }
    }, { immediate: true, flush: 'post' });

    // board movements during normal gameplay
    watch(() => jepStore.selectedClue?.position, (newValue, oldValue) => {
        if (
            (newValue == null && oldValue == null) ||
            (oldValue != null && newValue != null && newValue[0] === oldValue[0] && newValue[1] === oldValue[1])
        ) {
            return;
        }

        if (newValue != null) {
            focusOnBoardTile(boardElem.value!.querySelector('.clue.active') as HTMLElement, newValue[0]);
        } else {
            focusOffBoardTile();
        }
    }, { immediate: true, flush: 'post' });

    // board movements while revealing categories
    watch(() => jepStore.jepBoard.round !== 'FINAL_JEOPARDY' && jepStore.jepState.state === 'REVEALING_CATEGORIES' ? jepStore.jepState.lastRevealedCategoryIndex : null, (newValue, oldValue) => {
        if (newValue == null && oldValue == null || newValue === oldValue) {
            return;
        }

        if (newValue == null || newValue === -1) {
            focusOffBoardTile();
        } else {
            focusOnBoardTile(
                boardElem.value!.querySelector(`.category-name[data-category-index="${newValue}"]`) as HTMLElement,
                newValue,
                oldValue === -1 || oldValue == null ? 1.5 : 1,
                oldValue === -1 || oldValue == null ? 'expo.inOut' : 'power2.inOut'
            );
        }
    }, { immediate: true, flush: 'post' });
});
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@700&display=swap');

body {
    width: 100lvw;
    height: 100lvh;
}
</style>

<style scoped lang="scss">
@use '../../styles/constants';
@use '../../styles/colors';

.jep-board-wrapper {
    position: absolute;
    top: 0;
    left: 0;
    background-color: colors.$layout-gap;
    box-sizing: border-box;
    overflow: hidden;
    border: 3px solid colors.$layout-gap;

    .board-with-border {
        width: 100%;
        height: 100%;
        display: grid;
        grid-template-columns: 150px minmax(0, auto) 150px;
        grid-template-rows: 1fr minmax(0, auto) 1fr;
        position: relative;
        transform-origin: top left;

        > .side-panel-x {
            grid-row: span 3;
        }

        > .bg-timer {
            margin: 3px;
        }
    }

    &.live {
        width: 1920px;
        height: 1080px - constants.$omnibarHeight;

        .jep-board {
            aspect-ratio: 1.9;
        }
    }

    &.stage {
        width: 100%;
        height: 100%;
        display: grid;
        grid-template-rows: 1fr 105px;
        grid-template-columns: 1fr;

        .jep-board {
            aspect-ratio: 1.95;
        }

        > .contestant-info {
            grid-column: span 3;
        }
    }
}

.jep-board {
    overflow: hidden;
    position: relative;
    border-collapse: collapse;

    &.with-underlay {
        background: url('../../assets/img/jep-board-underlay.png') center;
        background-size: cover;
    }

    th {
        width: var(--column-width);
    }

    th, td {
        border: 3px solid colors.$layout-gap;
    }

    th, td {
        height: var(--row-height);
        overflow: hidden;
    }

    &.play-intro {
        .clue {
            transition: opacity 51ms linear;
        }

        // yeah, i know.
        // the clues on the original jeopardy board are revealed in a scripted order. the sequence is recreated here
        $reveal-time-scale: 400ms;

        > tr:nth-child(2) > td:nth-child(4),
        > tr:nth-child(3) > td:nth-child(6),
        > tr:nth-child(4) > td:nth-child(4),
        > tr:nth-child(5) > td:nth-child(2),
        > tr:nth-child(6) > td:nth-child(1) {
            transition-delay: $reveal-time-scale;
        }

        > tr:nth-child(2) > td:nth-child(1),
        > tr:nth-child(3) > td:nth-child(3),
        > tr:nth-child(4) > td:nth-child(2),
        > tr:nth-child(5) > td:nth-child(5),
        > tr:nth-child(6) > td:nth-child(4) {
            transition-delay: $reveal-time-scale * 2;
        }

        > tr:nth-child(2) > td:nth-child(6),
        > tr:nth-child(3) > td:nth-child(2),
        > tr:nth-child(4) > td:nth-child(5),
        > tr:nth-child(5) > td:nth-child(1),
        > tr:nth-child(6) > td:nth-child(3) {
            transition-delay: $reveal-time-scale * 3;
        }

        > tr:nth-child(2) > td:nth-child(3),
        > tr:nth-child(3) > td:nth-child(4),
        > tr:nth-child(4) > td:nth-child(3),
        > tr:nth-child(5) > td:nth-child(6),
        > tr:nth-child(6) > td:nth-child(5) {
            transition-delay: $reveal-time-scale * 4;
        }

        > tr:nth-child(2) > td:nth-child(5),
        > tr:nth-child(3) > td:nth-child(1),
        > tr:nth-child(4) > td:nth-child(6),
        > tr:nth-child(5) > td:nth-child(4),
        > tr:nth-child(6) > td:nth-child(2) {
            transition-delay: $reveal-time-scale * 5;
        }
    }
}

.board-underlay {
    // todo
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    background-color: darkorange;
    z-index: 0;
}

.contestant-info {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, 1fr);
    gap: 3px;
    position: relative;
    border-top: 3px solid colors.$layout-gap;
    background-color: colors.$layout-gap;

    > .contestant {
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
}

.bg-board-panel {
    background: linear-gradient(to top, #050D5B 0%, #071176 100%);
}

.category-name {
    color: #fff;
    padding: 6px;
    box-sizing: border-box;
    font-family: 'Roboto Condensed';
    font-size: 36px;
    font-weight: 700;
    text-align: center;

    > * {
        text-shadow: 4px 3px 0 rgba(0, 0, 0, 0.5);
        transition: opacity 250ms linear;
    }

    &.smaller {
        font-size: 28px;
    }
}

.clue {
    overflow: hidden;
    position: relative;

    &.active {
        .clue-cover {
            transform: scale(0.9) translateY(110%);
            transition-timing-function: cubic-bezier(0.5, 0, 0.75, 0);
        }
    }

    &.is-daily-double-clue .clue-cover {
        transition-delay: 0ms;
    }

    .clue-cover {
        height: 100%;
        width: 100%;
        transition: transform 500ms cubic-bezier(0.25, 1, 0.5, 1) 1000ms;
        position: absolute;
        top: 0;
        left: 0;
        box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.5);

        > * {
            text-shadow: 8px 6px 0 rgba(0, 0, 0, 0.75);
            color: #D59E4C;
            font-size: 100px;
            font-weight: 700;
            font-family: 'Roboto Condensed';
        }
    }

    .daily-double-cover {
        height: 100%;
        width: 100%;
        position: absolute;
        top: 0;
        left: 0;
        background: url('../../assets/img/jep-daily-double-overlay.png') center;
        background-size: cover;
    }

    .clue-prompt {
        font-family: 'Mass Transit Mono';
        font-weight: 700;
        text-rendering: geometricPrecision;
        box-sizing: border-box;
        padding: 16px;
        text-align: center;
        height: 100%;
        width: 100%;
        position: absolute;
        top: 0;
        left: 0;
        color: #ffffff;
        background: #0a0a0a;
        font-size: 18px;
        line-height: 1.1;

        &.smaller {
            font-size: 14px;
        }

        > * {
            filter: drop-shadow(0 0 0.25px rgba(255, 255, 255, 0.75));
        }
    }
}
</style>
