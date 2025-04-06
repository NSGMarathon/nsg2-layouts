import './styles/graphics-common.scss';

import { createApp } from 'vue';
import { installCommonHelpers } from 'client-shared/helpers/InstallCommonHelpers';
import { createPinia } from 'pinia';
import GameLayoutGraphic from './pages/game-layout/GameLayoutGraphic.vue';
import { initObsStore } from 'client-shared/stores/ObsStore';
import { initScheduleStore } from 'client-shared/stores/ScheduleStore';
import { initTalentStore } from 'client-shared/stores/TalentStore';
import { initTimerStore } from 'client-shared/stores/TimerStore';
import { initAssetStore } from 'client-shared/stores/AssetStore';
import { initMixerStore, useMixerStore } from 'client-shared/stores/MixerStore';
import { initTextScrollEventBus } from './helpers/TextScrollEventBus';
import { initSpeedrunPlaylistStore } from 'client-shared/stores/SpeedrunPlaylistStore';

(async () => {
    const app = createApp(GameLayoutGraphic);
    installCommonHelpers(app);
    app.use(createPinia());
    await Promise.all([
        initObsStore(),
        initScheduleStore(),
        initTalentStore(),
        initTimerStore(),
        initAssetStore(),
        initMixerStore(),
        initSpeedrunPlaylistStore()
    ]);
    initTextScrollEventBus(app);
    useMixerStore().listenForMixerLevels();
    app.mount('#app');
})();
