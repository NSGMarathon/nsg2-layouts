<template>
    <div class="omnibar-schedule-item-display">
        <vfd-pixel-text
            :font-size="24"
            :text-content="props.scheduleItem?.title ?? 'Nothing!'"
            text-align="left"
            @scroll-started="onScrollStart(0)"
            @scroll-end-reached="onScrollEnd(0)"
        />
        <vfd-pixel-text
            :font-size="24"
            :text-content="secondLine"
            text-align="left"
            @scroll-started="onScrollStart(1)"
            @scroll-end-reached="onScrollEnd(1)"
        />
    </div>
</template>

<script setup lang="ts">
import VfdPixelText from 'components/VfdPixelText.vue';
import { ScheduleItem } from 'types/ScheduleHelpers';
import { computed, onMounted } from 'vue';
import { useTalentStore } from 'client-shared/stores/TalentStore';
import { isBlank } from 'shared/StringHelper';

const talentStore = useTalentStore();

const props = defineProps<{
    scheduleItem?: ScheduleItem | null
}>();

const emit = defineEmits<{
    'readyToSwitch': []
}>();
let readyToSwitchMessageTimeout: number | undefined = undefined;
let finishedScrolls = [true, true];
onMounted(() => {
     readyToSwitchMessageTimeout = window.setTimeout(() => {
         emit('readyToSwitch');
     }, 1000);
});
// If the text on this slide scrolls, we want to show this slide at minimum until all displayed text has finished scrolling
function onScrollStart(lineIndex: number) {
    window.clearTimeout(readyToSwitchMessageTimeout);
    finishedScrolls[lineIndex] = false;
}
function onScrollEnd(lineIndex: number) {
    finishedScrolls[lineIndex] = true;
    if (finishedScrolls.every(scroll => scroll)) {
        emit('readyToSwitch');
    }
}

const secondLine = computed(() => {
    if (props.scheduleItem == null) return '';
    if (props.scheduleItem.type === 'SPEEDRUN') {
        if (!isBlank(props.scheduleItem.category)) {
            return `${props.scheduleItem.category}·${talentStore.formatSpeedrunTeamList(props.scheduleItem)}`;
        } else {
            return talentStore.formatSpeedrunTeamList(props.scheduleItem);
        }
    } else {
        return props.scheduleItem.talentIds.length === 0 ? '' : talentStore.formatTalentIdList(props.scheduleItem.talentIds, 4);
    }
});
</script>

<style scoped lang="scss">
.omnibar-schedule-item-display {
    width: 100%;
}
</style>
