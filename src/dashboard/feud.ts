import './styles/dashboard-common.scss';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { setUpErrorHandler } from './helpers/ErrorHandlerStore';
import { installCommonHelpers } from 'client-shared/helpers/InstallCommonHelpers';
import { initFeudStore } from 'client-shared/stores/FeudStore';
import FeudPanel from './pages/feud/FeudPanel.vue';

(async () => {
    const app = createApp(FeudPanel);
    app.use(createPinia());
    setUpErrorHandler(app);
    installCommonHelpers(app, false);
    await Promise.all([
        initFeudStore(),
    ]);
    app.mount('#app');
})();
