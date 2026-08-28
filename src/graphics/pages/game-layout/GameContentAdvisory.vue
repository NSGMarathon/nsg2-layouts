<template>
    <div
        v-if="scheduleStore.contentAdvisoryMessage != null"
        class="content-advisory layout vertical center-vertical"
        :class="{ 'fixed-height': props.fixedHeight }"
    >
        <fitted-content
            v-if="props.fixedHeight"
            v-for="segment of splitContentAdvisory"
            align="center"
        >
            {{ segment }}
        </fitted-content>
        <div
            v-else
            v-for="segment of splitContentAdvisory"
        >
            {{ segment }}
        </div>
    </div>
</template>

<script setup lang="ts">
import FittedContent from 'components/FittedContent.vue';
import { useScheduleStore } from 'client-shared/stores/ScheduleStore';
import { computed } from 'vue';

const props = defineProps<{
    fixedHeight?: boolean
    narrow?: boolean
}>();

const scheduleStore = useScheduleStore();

const splitContentAdvisory = computed(() => {
     if (scheduleStore.contentAdvisoryMessage == null) {
         return [];
     }
     if (!props.narrow) {
        return [scheduleStore.contentAdvisoryMessage];
     }

     const colonIndex = scheduleStore.contentAdvisoryMessage.indexOf(':');
     if (colonIndex === -1) {
         return [scheduleStore.contentAdvisoryMessage];
     } else {
         return [
             scheduleStore.contentAdvisoryMessage.substring(0, colonIndex + 1),
             scheduleStore.contentAdvisoryMessage.substring(colonIndex + 1).trim()
         ];
     }
});
</script>

<style scoped lang="scss">
.content-advisory {
    background: linear-gradient(to bottom, #FD3F40, #FD1819);
    color: #fff;
    font-weight: 500;
    font-size: 24px;
    overflow: hidden;
    padding: 4px 8px;
    text-align: center;

    &.fixed-height {
        padding: 0 8px;
    }

    > * {
        width: 100%;
    }
}
</style>
