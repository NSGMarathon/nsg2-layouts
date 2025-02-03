<template>
    <div class="game-layout-wrapper">
        <component
            v-if="feedIndex != null"
            :is="gameLayoutComponentMap[obsStore.activeGameLayouts[feedIndex] as typeof layoutKeys[number]] ?? gameLayoutComponentMap['16x9-1g1c']"
        />
    </div>
</template>

<script setup lang="ts">
import { layoutKeys, layouts } from 'types/Layouts';
import { type Component, nextTick, onMounted, watch, ref, provide } from 'vue';
import Layout_16x9_1g1c from './layouts/Layout_16x9_1g1c.vue';
import Layout_16x9_2g1c from './layouts/Layout_16x9_2g1c.vue';
import { useObsStore } from 'client-shared/stores/ObsStore';
import range from 'lodash/range';
import { ObsVideoInputPositions } from 'types/schemas';
import { sendMessage } from 'client-shared/helpers/NodecgHelper';
import Layout_4x3_1g1c from './layouts/Layout_4x3_1g1c.vue';
import Layout_4x3_2g1c from './layouts/Layout_4x3_2g1c.vue';
import Layout_4x3_3g1c from './layouts/Layout_4x3_3g1c.vue';
import Layout_4x3_4g1c from './layouts/Layout_4x3_4g1c.vue';
import Layout_3x2_1g1c from './layouts/Layout_3x2_1g1c.vue';
import Layout_16x9_4g1c from './layouts/Layout_16x9_4g1c.vue';
import Layout_16x9_3g1c from './layouts/Layout_16x9_3g1c.vue';
import Layout_4x3_2x1_sonics_gameworld from './layouts/Layout_4x3_2x1_sonics_gameworld.vue';
import { GameLayoutFeedIndexInjectionKey, PlayerNameplateModeInjectionKey } from '../../helpers/Injections';

const obsStore = useObsStore();

const gameLayoutComponentMap: Record<typeof layoutKeys[number], Component> = {
    '16x9-1g1c': Layout_16x9_1g1c,
    '16x9-2g1c': Layout_16x9_2g1c,
    '16x9-3g1c': Layout_16x9_3g1c,
    '16x9-4g1c': Layout_16x9_4g1c,
    '4x3-1g1c': Layout_4x3_1g1c,
    '4x3-2g1c': Layout_4x3_2g1c,
    '4x3-3g1c': Layout_4x3_3g1c,
    '4x3-4g1c': Layout_4x3_4g1c,
    '3x2-1g1c': Layout_3x2_1g1c,
    '4x3-2x1-sonic-gameworld': Layout_4x3_2x1_sonics_gameworld
};

const params = new URLSearchParams(window.location.search);
const feedIndex = getFeedIndex(params);
provide(GameLayoutFeedIndexInjectionKey, feedIndex);

onMounted(() => {
    if (params.has('is-layout-leader')) {
        watch(() => obsStore.activeGameLayouts, async (newValue) => {
            await calculateCapturePositions(newValue[feedIndex], feedIndex);
        }, { immediate: true });
    }
});

function getFeedIndex(params: URLSearchParams): number {
    if (params.has('feed')) {
        const parsedIndex = parseInt(params.get('feed')!);
        if (!isNaN(parsedIndex) && parsedIndex >= 0 && parsedIndex <= 2) {
            return parsedIndex;
        } else {
            return 0;
        }
    } else {
        return 0;
    }
}

async function calculateCapturePositions(activeGameLayout: string, feedIndex: number) {
    await nextTick();
    const layoutMeta = layouts[activeGameLayout as typeof layoutKeys[number]];
    if (layoutMeta == null) return;

    const capturePositions: ObsVideoInputPositions[number] = {
        gameCaptures: [],
        cameraCaptures: []
    }

    const findCaptures = (type: 'game' | 'camera') => {
        const captureCount = type === 'game' ? layoutMeta.gameCaptureCount : layoutMeta.cameraCaptureCount;
        const captures = Array.from(document.querySelectorAll(type === 'game' ? '.game-capture' : '.camera-capture'));
        range(captureCount).forEach(captureIndex => {
            const captureAtIndex = captures.find(capture => (capture as HTMLElement).dataset.captureIndex === String(captureIndex)) as HTMLElement | undefined;
            if (captureAtIndex == null) {
                sendMessage('log:warning', `Layout ${activeGameLayout} - Cannot find ${type} capture at index ${captureIndex}`);
                return;
            }
            const boundingRect = captureAtIndex.getBoundingClientRect();
            capturePositions[type === 'game' ? 'gameCaptures' : 'cameraCaptures'].push({
                x: boundingRect.x,
                y: boundingRect.y,
                width: captureAtIndex.clientWidth,
                height: captureAtIndex.clientHeight
            });
        });
    }

    findCaptures('game');
    findCaptures('camera');

    const playerNameplates = Array.from(document.querySelectorAll('.player-nameplate'));
    range(layoutMeta.playerNameplateCount).forEach(playerNameplateIndex => {
        const nameplateAtIndex = playerNameplates.find(nameplate => (nameplate as HTMLElement).dataset.nameplateIndex === String(playerNameplateIndex));
        if (nameplateAtIndex == null) {
            sendMessage('log:warning', `Layout ${activeGameLayout} - Cannot find nameplate at index ${playerNameplateIndex}`);
        }
    });

    await sendMessage('obs:setVideoInputPositions', { feedIndex, positions: capturePositions });
}

const playerNameplateMode = ref<'name' | 'social'>('name');
setInterval(() => {
    playerNameplateMode.value = playerNameplateMode.value === 'name' ? 'social' : 'name';
}, 15000);
provide(PlayerNameplateModeInjectionKey, playerNameplateMode);
</script>

<style scoped lang="scss">
@use '../../styles/constants';

.game-layout-wrapper {
    position: absolute;
    top: 0;
    left: 0;
    width: 1920px;
    height: 1080px - constants.$omnibarHeight;
}
</style>
