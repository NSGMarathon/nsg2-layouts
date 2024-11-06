import './styles/graphics-common.scss';

import { createApp } from 'vue';
import OmnibarGraphic from './pages/omnibar/OmnibarGraphic.vue';
import { installCommonHelpers } from 'client-shared/helpers/InstallCommonHelpers';
import { createPinia } from 'pinia';
import { initScheduleStore } from 'client-shared/stores/ScheduleStore';
import { initTalentStore } from 'client-shared/stores/TalentStore';
import { initDonationStore } from 'client-shared/stores/DonationStore';
import { initCurrentTrackerDataStore } from 'client-shared/stores/CurrentTrackerDataStore';
import { initTextScrollEventBus } from './helpers/TextScrollEventBus';
import { initAllTrackerDataStore } from 'client-shared/stores/AllTrackerDataStore';

(async () => {
    const app = createApp(OmnibarGraphic);
    installCommonHelpers(app);
    app.use(createPinia());
    await Promise.all([
        initScheduleStore(),
        initTalentStore(),
        initDonationStore(),
        initCurrentTrackerDataStore(),
        initAllTrackerDataStore()
    ]);
    initTextScrollEventBus(app);
    app.mount('#app');
})();
