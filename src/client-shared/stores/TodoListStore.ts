import { defineStore } from 'pinia';
import { createReplicantStoreInitializer } from 'client-shared/helpers/StoreHelper';
import { TodoList } from 'types/schemas/todoList';

const todoList = nodecg.Replicant<TodoList>('todoList');

interface TodoListStore {
    todoList: TodoList
}

export const useTodoListStore = defineStore('todo', {
    state: () => ({
        todoList: null
    } as unknown as TodoListStore),
    getters: {
        techSetupTodoWithCompletionInfo: state => {
            const categories = state.todoList.techSetup.map(category => {
                const completedCount = category.items.filter(item => item.completed).length;

                return ({
                    ...category,
                    completedCount,
                    allCompleted: completedCount === category.items.length
                });
            });

            return {
                allCompleted: categories.every(category => category.allCompleted),
                categories
            };
        }
    }
});

export const initTodoListStore = createReplicantStoreInitializer([todoList], useTodoListStore);
