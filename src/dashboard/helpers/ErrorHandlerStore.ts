import { App } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { defineStore } from 'pinia';
import { isBlank } from 'shared/StringHelper';

export const useErrorHandlerStore = defineStore('errorHandler', {
    state: () => ({
        recentErrors: {}
    } as { recentErrors: Record<string, unknown> }),
    actions: {
        removeRecentError({ key }: { key: string }): void {
            delete this.recentErrors[key];
        },
        handleError({ err, info }: { err: unknown, info?: string }): void {
            if (!isBlank(info)) {
                console.error(`Got error from '${info}': \n`, err);
            } else {
                console.error(err);
            }

            if (Object.keys(this.recentErrors).length >= 2) return;

            const id = uuidv4();
            this.recentErrors[id] = err;
            window.setTimeout(() => {
                delete this.recentErrors[id];
            }, 25000);
        }
    }
});

export function setUpErrorHandler(app: App<unknown>): void {
    const store = useErrorHandlerStore();
    app.config.errorHandler = (err, vm, info) => {
        store.handleError({ err, info });
    };
}
