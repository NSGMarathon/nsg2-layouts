<template>
    <ipl-expanding-space
        v-if="todoListStore.todoList.techSetup.length > 0"
        v-model:expanded="isExpanded"
        v-bind="$attrs"
    >
        <template #title>
            <!-- Kind of ridiculous, but without this the header grows by 1px when any badge is added -->
            <span style="display: inline-block; margin-bottom: 1px; margin-right: 8px">
                Setup
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
        <ipl-space
            color="secondary"
            class="m-b-8 layout horizontal center-vertical"
        >
            <b class="m-r-8">Stage Display</b>
            <ipl-space style="min-width: 45px; margin-right: 8px; min-height: 34.5px; text-align: center">
                <ipl-label style="display: block; margin-top: -3px; margin-left: -2px; margin-bottom: 3px">Message</ipl-label>
                <stage-display-message-state-badge />
            </ipl-space>
            <ipl-toggle
                v-model="previewOnStageDisplay"
                use-neutral-colors
                true-label="Preview"
                false-label="Program"
                class="m-r-8 max-width"
            />
            <ipl-button
                label="Open Settings"
                style="width: 85%"
                @click="stageDisplayDialogOpen = true"
            />
        </ipl-space>
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
    <ipl-dialog
        v-model:is-open="stageDisplayDialogOpen"
        style="width: 450px"
    >
        <template #header>
            <ipl-dialog-title @close="stageDisplayDialogOpen = false">
                Stage Display
            </ipl-dialog-title>
        </template>
        <stage-display-config-form show-stream-tech-options />
    </ipl-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
    IplBadge,
    IplButton,
    IplCheckbox,
    IplDialog,
    IplDialogTitle,
    IplExpandingSpace, IplLabel,
    IplSpace,
    IplToggle
} from '@iplsplatoon/vue-components';
import { useTodoListStore } from 'client-shared/stores/TodoListStore';
import { useScheduleStore } from 'client-shared/stores/ScheduleStore';
import { sendMessage } from 'client-shared/helpers/NodecgHelper';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faCheckDouble } from '@fortawesome/free-solid-svg-icons/faCheckDouble';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck';
import StageDisplayConfigForm from '../../components/StageDisplayConfigForm.vue';
import { useStageDisplayStore } from 'client-shared/stores/StageDisplayStore';
import StageDisplayMessageStateBadge from '../../components/StageDisplayMessageStateBadge.vue';

library.add(faCheckDouble, faCheck);

const isExpanded = ref(true);
const todoListStore = useTodoListStore();
const scheduleStore = useScheduleStore();
const stageDisplayStore = useStageDisplayStore();

const stageDisplayDialogOpen = ref(false);
const previewOnStageDisplay = computed({
    get() {
        return stageDisplayStore.stageDisplayState.mode === 'PREVIEW';
    },
    set(newValue: boolean) {
        stageDisplayStore.setStageDisplayMode(newValue ? 'PREVIEW' : 'PROGRAM');
    }
});

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
