import './styles/dashboard-common.scss';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { setUpErrorHandler } from './helpers/ErrorHandlerStore';
import { installCommonHelpers } from 'client-shared/helpers/InstallCommonHelpers';
import { initScheduleStore } from 'client-shared/stores/ScheduleStore';
import SpeedrunPlaylistControlPanel from './pages/speedrun-playlist-control/SpeedrunPlaylistControlPanel.vue';
import { initVideoFileStore } from 'client-shared/stores/VideoFileStore';
import { initObsStore } from 'client-shared/stores/ObsStore';

(async () => {
    const app = createApp(SpeedrunPlaylistControlPanel);
    app.use(createPinia());
    setUpErrorHandler(app);
    installCommonHelpers(app, false);
    await Promise.all([
        initScheduleStore(),
        initVideoFileStore(),
        initObsStore()
    ]);
    app.mount('#app');
})();
