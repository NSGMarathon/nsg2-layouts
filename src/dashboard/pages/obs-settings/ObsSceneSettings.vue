<template>
    <ipl-space>
        <ipl-select
            v-model="videoInputsScene"
            label="Video inputs scene"
            :options="sceneOptions"
        />
        <ipl-select
            v-model="gameLayoutVideoFeedScenes[0]"
            label="Main feed inputs scene"
            :options="sceneOptions"
            class="m-t-4"
        />
        <ipl-select
            v-model="gameLayoutVideoFeedScenes[1]"
            label="Inputs scene (Feed 2)"
            :options="sceneOptions"
            class="m-t-4"
        />
        <ipl-select
            v-model="gameLayoutVideoFeedScenes[2]"
            label="Inputs scene (Feed 3)"
            :options="sceneOptions"
            class="m-t-4"
        />
        <ipl-select
            v-model="gameplayScene"
            label="Gameplay scene"
            :options="sceneOptions"
            class="m-t-4"
        />
        <ipl-select
            v-model="intermissionScene"
            label="Intermission scene"
            :options="sceneOptions"
            class="m-t-4"
        />
        <ipl-button
            label="Update"
            class="m-t-8"
            :color="isChanged ? 'red' : 'blue'"
            @click="update"
        />
    </ipl-space>
</template>

<script setup lang="ts">
import { IplButton, IplSelect, IplSpace } from '@iplsplatoon/vue-components';
import { computed, ref } from 'vue';
import { useObsStore } from 'client-shared/stores/ObsStore';
import { updateRefOnValueChange } from 'client-shared/helpers/StoreHelper';
import { sendMessage } from 'client-shared/helpers/NodecgHelper';

const obsStore = useObsStore();

const sceneOptions = computed(() => obsStore.obsState.scenes?.map(scene => ({
    value: scene,
    name: scene
})) ?? []);

const videoInputsScene = ref('');
const gameLayoutVideoFeedScenes = ref<(string | null)[]>([]);
const gameplayScene = ref('');
const intermissionScene = ref('');
updateRefOnValueChange(() => obsStore.obsConfig.gameplayScene, gameplayScene);
updateRefOnValueChange(() => obsStore.obsConfig.intermissionScene, intermissionScene);
updateRefOnValueChange(() => obsStore.obsConfig.videoInputsScene, videoInputsScene);
updateRefOnValueChange(() => obsStore.obsConfig.gameLayoutVideoFeedScenes, gameLayoutVideoFeedScenes);

const isChanged = computed(() =>
    videoInputsScene.value !== obsStore.obsConfig.videoInputsScene
    || gameLayoutVideoFeedScenes.value.some((scene, i) => obsStore.obsConfig.gameLayoutVideoFeedScenes[i] !== scene)
    || intermissionScene.value !== obsStore.obsConfig.intermissionScene
    || gameplayScene.value !== obsStore.obsConfig.gameplayScene);

async function update() {
    await sendMessage('obs:setConfig', {
        videoInputsScene: videoInputsScene.value,
        gameLayoutVideoFeedScenes: gameLayoutVideoFeedScenes.value,
        intermissionScene: intermissionScene.value,
        gameplayScene: gameplayScene.value
    });
}
</script>
