import './styles/graphics-common.scss';

import { createApp } from 'vue';
import { installCommonHelpers } from 'client-shared/helpers/InstallCommonHelpers';
import { createPinia } from 'pinia';
import { initTextScrollEventBus } from './helpers/TextScrollEventBus';
import { initFeudStore } from 'client-shared/stores/FeudStore';
import FeudLowerThirdGraphic from './pages/feud-lower-third/FeudLowerThirdGraphic.vue';

(async () => {
    const app = createApp(FeudLowerThirdGraphic);
    installCommonHelpers(app);
    app.use(createPinia());
    await Promise.all([
        initFeudStore(),
    ]);
    initTextScrollEventBus(app);
    app.mount('#app');
})();
