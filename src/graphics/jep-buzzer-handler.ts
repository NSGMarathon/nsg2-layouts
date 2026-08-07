import './styles/utility-common.scss';

import { createApp } from 'vue';
import { installCommonHelpers } from 'client-shared/helpers/InstallCommonHelpers';
import { createPinia } from 'pinia';
import { initJepStore } from 'client-shared/stores/JepStore';
import JepBuzzerHandlerGraphic from './pages/jep-buzzer-handler/JepBuzzerHandlerGraphic.vue';

(async () => {
    const app = createApp(JepBuzzerHandlerGraphic);
    installCommonHelpers(app);
    app.use(createPinia());
    await Promise.all([
        initJepStore()
    ]);
    app.mount('#app');
})();
