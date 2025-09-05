<template>
    <ipl-space
        class="todo-list-status-display"
        :class="{ 'all-completed': todoListStore.techSetupTodoWithCompletionInfo.allCompleted }"
    >
        <div
            v-if="todoListStore.techSetupTodoWithCompletionInfo.allCompleted"
            class="max-width"
        >
            <span style="font-weight: 700">Tech setup is complete!</span><br>
            Stand by for permission to begin the show.
        </div>
        <template v-else>
            <div>The next run is being set up...</div>
            <div class="completed-item-count">
                <span class="completed-item-percentage">{{ Math.round((todoListCounts.completed / todoListCounts.total) * 100) }}%</span><br>
                {{ todoListCounts.completed }} / {{ todoListCounts.total }}
            </div>
        </template>
    </ipl-space>
</template>

<script setup lang="ts">
import { useTodoListStore } from 'client-shared/stores/TodoListStore';
import { computed } from 'vue';
import { IplSpace } from '@iplsplatoon/vue-components';

const todoListStore = useTodoListStore();

const todoListCounts = computed(() => ({
    completed: todoListStore.techSetupTodoWithCompletionInfo.categories.reduce((result, category) => {
        return result + category.completedCount
    }, 0),
    total: todoListStore.techSetupTodoWithCompletionInfo.categories.reduce((result, category) => {
        return result + category.items.length
    }, 0)
}))
</script>

<style scoped lang="scss">
.todo-list-status-display {
    min-height: 45px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    text-align: center;

    &.all-completed {
        background-color: rgb(0, 166, 81);
    }
}

.completed-item-count {
    text-align: right;
}

.completed-item-percentage {
    font-weight: 700;
    font-size: 1.25em;
}
</style>
