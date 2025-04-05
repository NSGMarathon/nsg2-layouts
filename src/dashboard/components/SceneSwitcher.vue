<template>
    <ipl-space>
        <div class="layout horizontal">
            <ipl-button
                :disabled="!shouldAllowSceneSwitch(obsStore.obsConfig.gameplayScenes[0])"
                class="m-r-8 max-width"
                @click="switchScene(obsStore.obsConfig.gameplayScenes[0])"
            >
                <font-awesome-icon icon="gamepad" /> MAIN
            </ipl-button>
            <ipl-button
                :disabled="!shouldAllowSceneSwitch(obsStore.obsConfig.gameplayScenes[1])"
                class="m-r-8 max-width"
                @click="switchScene(obsStore.obsConfig.gameplayScenes[1])"
            >
                <font-awesome-icon icon="gamepad" /> 2
            </ipl-button>
            <ipl-button
                :disabled="!shouldAllowSceneSwitch(obsStore.obsConfig.gameplayScenes[2])"
                class="max-width"
                @click="switchScene(obsStore.obsConfig.gameplayScenes[2])"
            >
                <font-awesome-icon icon="gamepad" /> 3
            </ipl-button>
        </div>
        <ipl-button
            class="m-t-8"
            label="Switch to intermission"
            :disabled="!shouldAllowSceneSwitch(obsStore.obsConfig.intermissionScene)"
            color="red"
            @click="switchScene(obsStore.obsConfig.intermissionScene)"
        />
        <ipl-button
            class="m-t-8"
            label="Play video"
            :disabled="obsStore.obsState.transitionInProgress || obsStore.obsState.status !== 'CONNECTED' || videoFileStore.interstitialVideoState.isRunning"
            @click="interstitialVideoPlayerDialog?.open()"
        />
    </ipl-space>
</template>

<script setup lang="ts">
import { IplButton, IplSpace } from '@iplsplatoon/vue-components';
import { useObsStore } from 'client-shared/stores/ObsStore';
import { sendMessage } from 'client-shared/helpers/NodecgHelper';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faGamepad } from '@fortawesome/free-solid-svg-icons/faGamepad';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { inject } from 'vue';
import { InterstitialVideoPlayerDialogInjectionKey } from '../helpers/Injections';
import { useVideoFileStore } from 'client-shared/stores/VideoFileStore';

library.add(faGamepad);

const interstitialVideoPlayerDialog = inject(InterstitialVideoPlayerDialogInjectionKey);

const obsStore = useObsStore();
const videoFileStore = useVideoFileStore();

function shouldAllowSceneSwitch(sceneName?: string | null) {
    return sceneName != null
        && !obsStore.obsState.transitionInProgress
        && obsStore.obsState.status === 'CONNECTED'
        && obsStore.obsState.currentScene !== sceneName;
}

async function switchScene(sceneName?: string | null) {
    if (!sceneName) return;
    await sendMessage('obs:setCurrentScene', { sceneName });
}
</script>
