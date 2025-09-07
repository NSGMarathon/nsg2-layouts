import './styles/utility-common.scss';

import { createApp } from 'vue';
import { installCommonHelpers } from 'client-shared/helpers/InstallCommonHelpers';
import { createPinia } from 'pinia';
import StageDisplayGraphic from './pages/utility-stage-display/StageDisplayGraphic.vue';
import { initTodoListStore } from 'client-shared/stores/TodoListStore';
import { initStageDisplayStore } from 'client-shared/stores/StageDisplayStore';
import { initScheduleStore } from 'client-shared/stores/ScheduleStore';
import { initTalentStore } from 'client-shared/stores/TalentStore';

(async () => {
    const app = createApp(StageDisplayGraphic);
    installCommonHelpers(app, false);
    app.use(createPinia());
    await Promise.all([
        initTodoListStore(),
        initStageDisplayStore(),
        initScheduleStore(),
        initTalentStore()
    ]);
    app.mount('#app');
})();
