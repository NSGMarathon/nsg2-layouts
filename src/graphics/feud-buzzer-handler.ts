import './styles/graphics-common.scss';

import { createApp } from 'vue';
import { installCommonHelpers } from 'client-shared/helpers/InstallCommonHelpers';
import { createPinia } from 'pinia';
import { initTextScrollEventBus } from './helpers/TextScrollEventBus';
import { initFeudStore } from 'client-shared/stores/FeudStore';
import FeudBuzzerHandlerGraphic from './pages/feud-buzzer-handler/FeudBuzzerHandlerGraphic.vue';

(async () => {
    const app = createApp(FeudBuzzerHandlerGraphic);
    installCommonHelpers(app);
    app.use(createPinia());
    await Promise.all([
        initFeudStore(),
    ]);
    initTextScrollEventBus(app);
    app.mount('#app');
})();
