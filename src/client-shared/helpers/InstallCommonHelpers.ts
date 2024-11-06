import { App } from 'vue';
import { addDots } from 'client-shared/helpers/StringHelper';
import { isBlank } from 'shared/StringHelper';

export function installCommonHelpers(app: App, isGraphic = true): void {
    if (!window.obsstudio && isGraphic) {
        document.getElementById('app')!.style.backgroundColor = '#333';
    }

    app.config.globalProperties.$helpers = {
        addDots,
        isBlank
    };
}

declare module '@vue/runtime-core' {
    interface ComponentCustomProperties {
        $helpers: {
            addDots: typeof addDots
            isBlank: typeof isBlank
        }
    }
}
