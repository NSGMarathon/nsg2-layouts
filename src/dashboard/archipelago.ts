import './styles/dashboard-common.scss';

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { setUpErrorHandler } from './helpers/ErrorHandlerStore';
import { installCommonHelpers } from 'client-shared/helpers/InstallCommonHelpers';
import { initArchipelagoStore } from 'client-shared/stores/ArchipelagoStore';
import ArchipelagoPanel from './pages/archipelago/ArchipelagoPanel.vue';

(async () => {
    const app = createApp(ArchipelagoPanel);
    app.use(createPinia());
    setUpErrorHandler(app);
    installCommonHelpers(app, false);
    await initArchipelagoStore();
    app.mount('#app');
})();
