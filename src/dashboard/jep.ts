import './styles/dashboard-common.scss';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { setUpErrorHandler } from './helpers/ErrorHandlerStore';
import { installCommonHelpers } from 'client-shared/helpers/InstallCommonHelpers';
import { initJepStore } from 'client-shared/stores/JepStore';
import JepPanel from './pages/jep/JepPanel.vue';

(async () => {
    const app = createApp(JepPanel);
    app.use(createPinia());
    setUpErrorHandler(app);
    installCommonHelpers(app, false);
    await Promise.all([
        initJepStore(),
    ]);
    app.mount('#app');
})();
