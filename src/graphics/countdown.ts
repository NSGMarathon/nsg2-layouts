import './styles/graphics-common.scss';

import { createApp } from 'vue';
import { installCommonHelpers } from 'client-shared/helpers/InstallCommonHelpers';
import { createPinia } from 'pinia';
import { initCountdownStore } from 'client-shared/stores/CountdownStore';
import CountdownGraphic from './pages/countdown/CountdownGraphic.vue';
import { initTextScrollEventBus } from './helpers/TextScrollEventBus';

(async () => {
    const app = createApp(CountdownGraphic);
    installCommonHelpers(app);
    app.use(createPinia());
    await Promise.all([
        initCountdownStore()
    ]);
    initTextScrollEventBus(app);
    app.mount('#app');
})();
