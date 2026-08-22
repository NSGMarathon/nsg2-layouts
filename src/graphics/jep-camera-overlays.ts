import './styles/graphics-common.scss';

import { createApp } from 'vue';
import { installCommonHelpers } from 'client-shared/helpers/InstallCommonHelpers';
import { createPinia } from 'pinia';
import { initJepStore } from 'client-shared/stores/JepStore';
import JepCameraOverlaysGraphic from './pages/jep-camera-overlays/JepCameraOverlaysGraphic.vue';

(async () => {
    const app = createApp(JepCameraOverlaysGraphic);
    installCommonHelpers(app);
    app.use(createPinia());
    await Promise.all([
        initJepStore()
    ]);
    app.mount('#app');
})();
