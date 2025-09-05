<template>
    <ipl-expanding-space
        v-if="todoListStore.todoList.techSetup.length > 0"
        v-model:expanded="isExpanded"
    >
        <template #title>
            <!-- Kind of ridiculous, but without this the header grows by 1px when any badge is added -->
            <span style="display: inline-block; margin-bottom: 1px; margin-right: 8px">
                Setup todo
            </span>
            <ipl-badge
                v-if="todoListStore.techSetupTodoWithCompletionInfo.allCompleted"
                color="green"
            >
                <font-awesome-icon
                    icon="check-double"
                    size="sm"
                />
                All done!
            </ipl-badge>
            <ipl-badge
                v-else
                v-show="!isExpanded"
                v-for="category in todoListStore.techSetupTodoWithCompletionInfo.categories"
                :key="category.name"
                :color="category.allCompleted ? 'green' : 'blue'"
            >
                <font-awesome-icon
                    v-show="category.allCompleted"
                    icon="check"
                    size="sm"
                />
                {{ category.name }}: {{ category.allCompleted ? 'OK!' : `${category.completedCount} / ${category.items.length}` }}
            </ipl-badge>
        </template>
        <div class="category-list">
            <div
                v-for="category in todoListStore.techSetupTodoWithCompletionInfo.categories"
                :key="category.name"
            >
                <div
                    class="category-title"
                    :class="{ 'all-completed': category.allCompleted }"
                >
                    {{ category.name }}
                </div>
                <hr class="m-y-4" >
                <ipl-checkbox
                    v-for="item in category.items"
                    :model-value="item.completed"
                    :key="`${category.name}_${item.name}`"
                    class="category-item-checkbox"
                    @update:model-value="setCompleted(category.name, item.name, $event)"
                >
                    {{ item.name }}
                </ipl-checkbox>
            </div>
        </div>
    </ipl-expanding-space>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { IplBadge, IplCheckbox, IplExpandingSpace } from '@iplsplatoon/vue-components';
import { useTodoListStore } from 'client-shared/stores/TodoListStore';
import { useScheduleStore } from 'client-shared/stores/ScheduleStore';
import { sendMessage } from 'client-shared/helpers/NodecgHelper';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faCheckDouble } from '@fortawesome/free-solid-svg-icons/faCheckDouble';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck';

library.add(faCheckDouble, faCheck);

const isExpanded = ref(true);
const todoListStore = useTodoListStore();
const scheduleStore = useScheduleStore();

function setCompleted(categoryName: string, listItemName: string, completed: boolean) {
    sendMessage('todo:setCompleted', { categoryName, listItemName, completed });
}

watch(() => scheduleStore.activeSpeedrun?.id, () => {
    isExpanded.value = true;
});
</script>

<style scoped lang="scss">
.category-item-checkbox {
    background-color: rgba(0, 0, 0, 0.08);
    margin-top: 4px;
    overflow-wrap: anywhere;

    &.checked {
        background-color: rgba(0, 166, 81, 0.5);

        &:hover {
            background-color: rgba(0, 166, 81, 0.75);
        }

        &:active {
            background-color: rgba(0, 166, 81, 0.6);
        }
    }
}

.category-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(135px, 1fr));
    gap: 8px;
}

.category-title {
    border-radius: 5px;
    padding: 2px 4px;
    text-align: center;
    font-variant-caps: all-small-caps;
    transition: background-color 200ms;

    &.all-completed {
        background-color: rgba(0, 166, 81, 0.5);
    }
}
</style>
