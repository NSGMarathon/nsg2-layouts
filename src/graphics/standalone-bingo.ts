import './styles/graphics-common.scss';

import { createApp } from 'vue';
import { installCommonHelpers } from 'client-shared/helpers/InstallCommonHelpers';
import { createPinia } from 'pinia';
import StandaloneBingoGraphic from './pages/standalone-bingo/StandaloneBingoGraphic.vue';
import { initBingoStore } from 'client-shared/stores/BingoStore';

(async () => {
    const app = createApp(StandaloneBingoGraphic);
    installCommonHelpers(app);
    app.use(createPinia());
    await Promise.all([
        initBingoStore()
    ]);
    app.mount('#app');
})();
