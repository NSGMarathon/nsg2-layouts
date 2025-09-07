import './styles/dashboard-common.scss';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { setUpErrorHandler } from './helpers/ErrorHandlerStore';
import { installCommonHelpers } from 'client-shared/helpers/InstallCommonHelpers';
import { initScheduleStore } from 'client-shared/stores/ScheduleStore';
import { initTalentStore } from 'client-shared/stores/TalentStore';
import { initTimerStore } from 'client-shared/stores/TimerStore';
import { initDonationStore } from 'client-shared/stores/DonationStore';
import HostPanel from './pages/host/HostPanel.vue';
import { initObsStore } from 'client-shared/stores/ObsStore';
import { initAllTrackerDataStore } from 'client-shared/stores/AllTrackerDataStore';
import { initCurrentTrackerDataStore } from 'client-shared/stores/CurrentTrackerDataStore';
import { initTwitchDataStore } from 'client-shared/stores/TwitchDataStore';
import { initVideoFileStore } from 'client-shared/stores/VideoFileStore';
import { initTodoListStore } from 'client-shared/stores/TodoListStore';
import { initStageDisplayStore } from 'client-shared/stores/StageDisplayStore';

document.title = 'Host Layout Controls';

(async () => {
    const app = createApp(HostPanel);
    app.use(createPinia());
    setUpErrorHandler(app);
    installCommonHelpers(app, false);
    await Promise.all([
        initScheduleStore(),
        initTalentStore(),
        initTimerStore(),
        initDonationStore(),
        initObsStore(),
        initAllTrackerDataStore(),
        initCurrentTrackerDataStore(),
        initTwitchDataStore(),
        initVideoFileStore(),
        initTodoListStore(),
        initStageDisplayStore()
    ]);
    app.mount('#app');
})();
