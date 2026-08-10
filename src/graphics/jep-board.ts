import './styles/graphics-common.scss';

import { createApp } from 'vue';
import { installCommonHelpers } from 'client-shared/helpers/InstallCommonHelpers';
import { createPinia } from 'pinia';
import { initJepStore } from 'client-shared/stores/JepStore';
import JepBoardGraphic from './pages/jep-board/JepBoardGraphic.vue';
import { initTextScrollEventBus } from './helpers/TextScrollEventBus';

(async () => {
    const app = createApp(JepBoardGraphic);
    installCommonHelpers(app);
    app.use(createPinia());
    await Promise.all([
        initJepStore()
    ]);
    initTextScrollEventBus(app);
    app.mount('#app');
})();
