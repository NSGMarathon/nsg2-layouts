import './styles/dashboard-common.scss';
import { createApp } from 'vue';
import DataImportPanel from './pages/data-import/DataImportPanel.vue';
import { createPinia } from 'pinia';
import { setUpErrorHandler } from './helpers/ErrorHandlerStore';
import { installCommonHelpers } from 'client-shared/helpers/InstallCommonHelpers';

(async () => {
    const app = createApp(DataImportPanel);
    app.use(createPinia());
    setUpErrorHandler(app);
    installCommonHelpers(app, false);
    app.mount('#app');
})();
