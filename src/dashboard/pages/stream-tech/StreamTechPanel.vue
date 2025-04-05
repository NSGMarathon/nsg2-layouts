<template>
    <div class="stream-tech-layout">
        <layout-manager />
        <active-run-manager />
        <div>
            <next-run-manager />
            <div class="alerts m-t-8">
                <ipl-message
                    v-if="showLongTwitchTitleWarning"
                    type="warning"
                    closeable
                    class="m-t-8"
                    @close="showLongTwitchTitleWarning = false"
                >
                    Generated a Twitch title that was too long! It should be manually edited to fit within the character limit.
                </ipl-message>
                <ipl-message
                    v-if="showRemainingInterstitialsMessage"
                    :type="timerStore.timer.state === 'RUNNING' ? 'warning' : 'info'"
                    class="m-t-8"
                >
                    Remember to complete all interstitials before starting the next run.
                </ipl-message>
            </div>
            <system-status-display
                class="m-t-8"
                style="max-width: 285px; margin: 8px auto 0; box-sizing: border-box"
            />
            <countdown-manager style="max-width: 285px; margin: 8px auto 0;" />
        </div>
        <rundown-display class="rundown-display" />
    </div>
    <schedule-item-editor ref="scheduleItemEditor" />
    <country-select-dialog ref="countrySelectDialog" />
    <talent-item-edit-dialog ref="talentItemEditDialog" />
    <twitch-category-search-dialog ref="twitchCategorySearchDialog" />
    <video-file-select-dialog ref="videoFileSelectDialog" />
    <interstitial-video-player-dialog ref="interstitialVideoPlayerDialog" />
</template>

<script setup lang="ts">
import RundownDisplay from '../../components/RundownDisplay.vue';
import ActiveRunManager from './ActiveRunManager.vue';
import ScheduleItemEditor from '../../components/ScheduleItemEditor.vue';
import { computed, provide, ref } from 'vue';
import {
    CountrySelectDialogInjectionKey, InterstitialVideoPlayerDialogInjectionKey,
    ScheduleItemEditorInjectionKey,
    TalentItemEditDialogInjectionKey,
    TwitchCategorySearchDialogInjectionKey,
    VideoFileSelectDialogInjectionKey
} from '../../helpers/Injections';
import CountrySelectDialog from '../../components/CountrySelectDialog.vue';
import NextRunManager from './NextRunManager.vue';
import LayoutManager from './LayoutManager.vue';
import TalentItemEditDialog from '../../components/TalentItemEditDialog.vue';
import TwitchCategorySearchDialog from '../../components/TwitchCategorySearchDialog.vue';
import { IplMessage } from '@iplsplatoon/vue-components';
import { useScheduleStore } from 'client-shared/stores/ScheduleStore';
import SystemStatusDisplay from './SystemStatusDisplay.vue';
import { useTimerStore } from 'client-shared/stores/TimerStore';
import CountdownManager from './CountdownManager.vue';
import VideoFileSelectDialog from '../../components/VideoFileSelectDialog.vue';
import InterstitialVideoPlayerDialog from '../../components/InterstitialVideoPlayerDialog.vue';

const scheduleItemEditor = ref<InstanceType<typeof ScheduleItemEditor>>();
provide(ScheduleItemEditorInjectionKey, scheduleItemEditor);
const countrySelectDialog = ref<InstanceType<typeof CountrySelectDialog>>();
provide(CountrySelectDialogInjectionKey, countrySelectDialog);
const talentItemEditDialog = ref<InstanceType<typeof TalentItemEditDialog>>();
provide(TalentItemEditDialogInjectionKey, talentItemEditDialog);
const twitchCategorySearchDialog = ref<InstanceType<typeof TwitchCategorySearchDialog>>();
provide(TwitchCategorySearchDialogInjectionKey, twitchCategorySearchDialog);
const videoFileSelectDialog = ref<InstanceType<typeof VideoFileSelectDialog>>();
provide(VideoFileSelectDialogInjectionKey, videoFileSelectDialog);
const interstitialVideoPlayerDialog = ref<InstanceType<typeof InterstitialVideoPlayerDialog>>();
provide(InterstitialVideoPlayerDialogInjectionKey, interstitialVideoPlayerDialog);

const scheduleStore = useScheduleStore();
const timerStore = useTimerStore();

const showLongTwitchTitleWarning = ref(false);
nodecg.listenFor('twitch:generatedTitleTooLong', () => {
    showLongTwitchTitleWarning.value = true;
});
const showRemainingInterstitialsMessage = computed(() =>
    scheduleStore.interstitialsBeforeActiveRun.filter(interstitial => !interstitial.completed).length > 0);
</script>

<style lang="scss">
body {
    margin: 0 !important;
    overflow-y: hidden;
}
</style>

<style scoped lang="scss">
.stream-tech-layout {
    display: grid;
    height: 100vh;
    padding: 8px;
    grid-template-columns: 0.75fr 1.5fr 1fr 1fr;
    gap: 8px;
    box-sizing: border-box;
    min-width: 1500px;
    overflow-x: auto;
}

.alerts {
    min-height: 77px;
}
</style>
