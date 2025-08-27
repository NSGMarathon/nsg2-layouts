<template>
    <div ref="wrapper">
        <ipl-label>Twitch category</ipl-label>
        <div class="layout horizontal center-vertical">
            <ipl-space
                class="twitch-category-select"
                clickable
                :color="props.color"
                @click="onClick"
            >
                <span>{{ props.modelValue?.name ?? 'N/A' }}</span>
            </ipl-space>
            <ipl-button
                v-if="props.modelValue != null"
                icon="xmark"
                color="red"
                inline
                @click="emit('update:modelValue', undefined)"
            />
        </div>
        <twitch-category-search-dialog
            ref="searchDialog"
            :schedule-item-title="props.scheduleItemTitle"
            :style="floatingStyles"
        />
    </div>
</template>

<script setup lang="ts">
import { IplButton, IplLabel, IplSpace } from '@iplsplatoon/vue-components';
import { ScheduleItem } from 'types/ScheduleHelpers';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faXmark } from '@fortawesome/free-solid-svg-icons/faXmark';
import { ref } from 'vue';
import TwitchCategorySearchDialog from './TwitchCategorySearchDialog.vue';
import { offset, shift, size, useFloating } from '@floating-ui/vue';

library.add(faXmark);

const props = defineProps<{
    modelValue: ScheduleItem['twitchCategory']
    color: 'secondary' | 'primary'
    scheduleItemTitle: string
}>();

const emit = defineEmits<{
    'update:modelValue': [newValue: ScheduleItem['twitchCategory']]
    'update:releaseYear': [newValue: string]
}>();

const wrapper = ref<HTMLElement>();
const searchDialog = ref<InstanceType<typeof TwitchCategorySearchDialog>>();
const { floatingStyles, update } = useFloating(wrapper, searchDialog, {
    placement: 'left',
    middleware: [
        offset(8),
        shift({
            crossAxis: true,
            mainAxis: true,
            padding: 8
        }),
        size({
            padding: 8,
            apply(args: any) {
                args.elements.floating.style.maxHeight = args.availableHeight - args.y + 'px';
            }
        })
    ]
});

function onClick() {
    update();
    searchDialog?.value?.open(newValue => {
        emit('update:modelValue', {
            id: newValue.category.id,
            name: newValue.category.name,
            igdbUrl: newValue.igdbUrl
        });
        if (newValue.releaseYear != null) {
            emit('update:releaseYear', newValue.releaseYear);
        }
    });
}
</script>

<style scoped lang="scss">
.twitch-category-select {
    padding: 4px !important;
    text-align: center !important;
    box-sizing: border-box;

    span {
        font-weight: 600;
    }
}

.ipl-button {
    font-size: 0.6em !important;
    margin-left: 4px;
}
</style>
