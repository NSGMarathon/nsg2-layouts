import type NodeCG from '@nodecg/types';
import type { Configschema } from 'types/schemas';
import { HasNodecgLogger } from '../helpers/HasNodecgLogger';
import { TodoList } from 'types/schemas/todoList';
import { DeepReadonly } from 'ts-essentials';

export class TodoListService extends HasNodecgLogger {
    private readonly todoList: NodeCG.ServerReplicantWithSchemaDefault<TodoList>;
    private readonly todoListConfig: DeepReadonly<Configschema['todoList']>;

    constructor(nodecg: NodeCG.ServerAPI<Configschema>) {
        super(nodecg);
        this.todoList = nodecg.Replicant('todoList') as unknown as NodeCG.ServerReplicantWithSchemaDefault<TodoList>;
        this.todoListConfig = nodecg.bundleConfig.todoList;

        if (this.todoListConfig == null || this.todoListConfig.techSetup == null) {
            if (this.usingDebugLogging) {
                this.logger.debug('No todo list items have been configured');
            }

            this.todoList.value.techSetup = [];
        } else {
            if (this.usingDebugLogging) {
                const listItemCount = this.todoListConfig.techSetup.reduce((result, category) => {
                    return result + category.items.length;
                }, 0);

                this.logger.debug(`Initializing todo list (Categories: ${this.todoListConfig.techSetup.length}, Items: ${listItemCount})`);
            }

            this.todoList.value.techSetup = this.todoListConfig.techSetup.map(category => {
                const existingCategory = this.todoList.value.techSetup
                    .find(otherCategory => category.name === otherCategory.name);

                return {
                    name: category.name,
                    items: category.items.map(item => ({
                        name: item.name,
                        completed: existingCategory?.items.find(otherItem => item.name === otherItem.name)?.completed ?? false
                    }))
                };
            });
        }
    }

    reset() {
        this.todoList.value.techSetup = this.todoList.value.techSetup.map(category => ({
            ...category,
            items: category.items.map(item => ({
                ...item,
                completed: false
            }))
        }));
    }

    setCompleted(categoryName: string, listItemName: string, completed: boolean) {
        const categoryIndex = this.todoList.value.techSetup.findIndex(category => category.name === categoryName);
        if (categoryIndex === -1) {
            throw new Error(`Todo category "${categoryName}" does not exist`);
        }

        const itemIndex = this.todoList.value.techSetup[categoryIndex].items.findIndex(item => item.name === listItemName);
        if (itemIndex === -1) {
            throw new Error(`Item "${listItemName}" does not exist in todo category "${categoryName}"`);
        }

        this.todoList.value.techSetup[categoryIndex].items[itemIndex].completed = completed;
    }
}
