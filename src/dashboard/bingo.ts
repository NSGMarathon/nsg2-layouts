import './styles/dashboard-common.scss';

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { setUpErrorHandler } from './helpers/ErrorHandlerStore';
import { installCommonHelpers } from 'client-shared/helpers/InstallCommonHelpers';
import BingoPanel from './pages/bingo/BingoPanel.vue';
import { initBingoStore } from 'client-shared/stores/BingoStore';
import { initScheduleStore } from 'client-shared/stores/ScheduleStore';
import { initTalentStore } from 'client-shared/stores/TalentStore';

(async () => {
    const app = createApp(BingoPanel);
    app.use(createPinia());
    setUpErrorHandler(app);
    installCommonHelpers(app, false);
    await initBingoStore();
    await initScheduleStore();
    await initTalentStore();
    app.mount('#app');
})();
