import './styles/graphics-common.scss';

import { createApp } from 'vue';
import { installCommonHelpers } from 'client-shared/helpers/InstallCommonHelpers';
import { createPinia } from 'pinia';
import { initTextScrollEventBus } from './helpers/TextScrollEventBus';
import FeudBoardGraphic from './pages/feud-board/FeudBoardGraphic.vue';
import { initFeudStore } from 'client-shared/stores/FeudStore';

(async () => {
    const app = createApp(FeudBoardGraphic);
    installCommonHelpers(app);
    app.use(createPinia());
    await Promise.all([
        initFeudStore(),
    ]);
    initTextScrollEventBus(app);
    app.mount('#app');
})();
