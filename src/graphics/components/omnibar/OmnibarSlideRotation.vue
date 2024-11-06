<template>
    <div class="omnibar-main-content">
        <transition name="donation-reminder">
            <div
                v-if="slides.activeComponent.value?.startsWith('donationReminder')"
                class="omnibar-donation-reminder"
            >
                <opacity-swap-transition mode="default">
                    <span v-if="slides.activeComponent.value === 'donationReminder1'">You are watching <span class="emphasis">{{ eventName }}</span></span>
                    <span v-else>In support of the NABP - <span class="emphasis">{{ donationUrl }}</span></span>
                </opacity-swap-transition>
            </div>
            <div
                v-else
                class="omnibar-slides"
            >
                <transition name="slide-swap">
                    <div
                        :key="slideTitle"
                        class="slide-title"
                        :style="{ minWidth: `${props.slideTitleWidth}px`, width: `${props.slideTitleWidth}px` }"
                    >
                        <fitted-content class="slide-title-text">{{ slideTitle }}</fitted-content>
                        <div class="slide-title-icon">»</div>
                    </div>
                </transition>
                <div class="slide-content">
                    <transition name="slide-swap">
                        <div
                            v-if="slides.activeComponent.value === 'fallback'"
                            class="no-slide-placeholder max-height"
                        >
                            Benefiting Norges Blindeforbund
                        </div>
                        <omnibar-schedule-item-display
                            v-else-if="slides.activeComponent.value === 'nextUp'"
                            :key="nextScheduleItem?.id"
                            :schedule-item="nextScheduleItem"
                            @ready-to-switch="onSlideSwitchReady"
                        />
                        <omnibar-schedule-item-display
                            v-else-if="slides.activeComponent.value === 'later'"
                            :key="scheduleItemAfterNext?.id"
                            :schedule-item="scheduleItemAfterNext"
                            @ready-to-switch="onSlideSwitchReady"
                        />
                        <omnibar-schedule-item-display
                            v-else-if="slides.activeComponent.value === 'nextSpeedrun'"
                            :key="nextSpeedrun?.id"
                            :schedule-item="nextSpeedrun"
                            @ready-to-switch="onSlideSwitchReady"
                        />
                        <omnibar-milestone-display
                            v-else-if="slides.activeComponent.value === 'milestone'"
                            :key="visibleMilestone?.id"
                            :milestone="visibleMilestone!"
                        />
                        <omnibar-incentive-display
                            v-else-if="slides.activeComponent.value === 'incentive'"
                            :key="visibleIncentive?.id"
                            :incentive="visibleIncentive!"
                        />
                        <omnibar-bid-war-display
                            v-else-if="slides.activeComponent.value === 'bidwar'"
                            :key="visibleBidWar?.id"
                            :bid-war="visibleBidWar!"
                        />
                    </transition>
                </div>
            </div>
        </transition>
    </div>
</template>

<script setup lang="ts">
import { useScheduleStore } from 'client-shared/stores/ScheduleStore';
import { useCurrentTrackerDataStore } from 'client-shared/stores/CurrentTrackerDataStore';
import { computed, ComputedRef, MaybeRefOrGetter, ref, Ref, toValue, UnwrapRef } from 'vue';
import { getNextIndex } from '../../helpers/ArrayHelper';
import { Slide, useSlides } from '../../helpers/useSlides';
import { Configschema } from 'types/schemas';
import { useDonationStore } from 'client-shared/stores/DonationStore';
import OpacitySwapTransition from 'components/OpacitySwapTransition.vue';
import FittedContent from 'components/FittedContent.vue';
import OmnibarBidWarDisplay from 'components/omnibar/OmnibarBidWarDisplay.vue';
import OmnibarScheduleItemDisplay from 'components/omnibar/OmnibarScheduleItemDisplay.vue';
import OmnibarIncentiveDisplay from 'components/omnibar/OmnibarIncentiveDisplay.vue';
import OmnibarMilestoneDisplay from 'components/omnibar/OmnibarMilestoneDisplay.vue';

const props = withDefaults(defineProps<{
    withoutDonationReminder?: boolean
    slideTitleWidth: number
    withoutScheduleItems?: boolean
}>(), {
    withoutDonationReminder: false,
    withoutScheduleItems: false
});

const eventName = (nodecg.bundleConfig as Configschema).event?.name ?? 'the Norway Speedrunner Gathering';
const fallbackSlideTitle = (nodecg.bundleConfig as Configschema).event?.name ?? 'NSG';
const donationUrl = (nodecg.bundleConfig as Configschema).event?.donationUrl;
const showDonationReminder = computed(() => donationUrl != null && !props.withoutDonationReminder);

const donationStore = useDonationStore();
const scheduleStore = useScheduleStore();
const currentTrackerDataStore = useCurrentTrackerDataStore();

// Grab the next items on the schedule. If the next two items are interstitials, also show the next speedrun.
const interstitialsBeforeActiveRun = computed(() => props.withoutScheduleItems ? [] : scheduleStore.interstitialsBeforeActiveRun.filter(interstitial => !interstitial.completed));
const nextScheduleItem = computed(() => {
    if (props.withoutScheduleItems) {
        return null;
    } else if (interstitialsBeforeActiveRun.value.length === 1) {
        return scheduleStore.activeSpeedrun;
    } else if (interstitialsBeforeActiveRun.value.length > 1) {
        return interstitialsBeforeActiveRun.value[1];
    } else {
        return scheduleStore.findScheduleItemAfter(scheduleStore.activeSpeedrun?.id, undefined, false);
    }
});
const scheduleItemAfterNext = computed(() => {
    if (props.withoutScheduleItems) {
        return null;
    }

    return interstitialsBeforeActiveRun.value.length > 2
        ? interstitialsBeforeActiveRun.value[2]
        : scheduleStore.findScheduleItemAfter(nextScheduleItem.value?.id, undefined, false);
});
const nextSpeedrun = computed(() => {
    if (props.withoutScheduleItems) {
        return null;
    }
    if (
        interstitialsBeforeActiveRun.value.length > 1
        && nextScheduleItem.value?.id !== scheduleStore.activeSpeedrun?.id
        && scheduleItemAfterNext.value?.id !== scheduleStore.activeSpeedrun?.id
    ) return scheduleStore.activeSpeedrun;
    if (
        nextScheduleItem.value?.id === scheduleStore.nextSpeedrun?.id
        || scheduleItemAfterNext.value?.id === scheduleStore.nextSpeedrun?.id
    ) return null;

    return scheduleStore.nextSpeedrun;
});

const useRotatingList = <T extends { id: number }>(list: MaybeRefOrGetter<UnwrapRef<T>[]>): { visibleItem: Ref<UnwrapRef<T> | null>, beforeShow: () => void, enabled: ComputedRef<boolean> } => {
    const visibleItem = ref<T | null>(null);
    const beforeShow = () => {
        const unwrappedList = toValue(list);
        if (unwrappedList.length === 1 || visibleItem.value == null) {
            visibleItem.value = unwrappedList[0];
        } else {
            const visibleItemIndex = unwrappedList.findIndex(item => item.id === visibleItem.value!.id);
            if (visibleItemIndex === -1) {
                visibleItem.value = unwrappedList[0];
            } else {
                visibleItem.value = unwrappedList[getNextIndex(unwrappedList, visibleItemIndex)];
            }
        }
    };
    const enabled = computed(() => toValue(list).length > 0);

    return { visibleItem, beforeShow, enabled };
};

const {
    visibleItem: visibleMilestone,
    enabled: milestonesEnabled,
    beforeShow: beforeMilestoneShow
} = useRotatingList(() => currentTrackerDataStore.milestones.filter(milestone => donationStore.donationTotal >= milestone.start && donationStore.donationTotal < milestone.amount));

const {
    visibleItem: visibleIncentive,
    enabled: incentivesEnabled,
    beforeShow: beforeIncentiveShow
} = useRotatingList(() => {
    const allIncentives = currentTrackerDataStore.currentBids.filter(bid => (bid.options == null || bid.options.length === 0) && bid.goal != null);
    const pinnedIncentives = allIncentives.filter(incentive => incentive.pinned);
    if (pinnedIncentives.length > 0 || anyBidsPinned.value) {
        return pinnedIncentives;
    }
    return allIncentives;
});

const {
    visibleItem: visibleBidWar,
    enabled: bidWarsEnabled,
    beforeShow: beforeBidWarShow
} = useRotatingList(() => {
    const allBids = currentTrackerDataStore.currentBids.filter(bid => bid.options != null && (bid.userOptionsAllowed || bid.options.length > 0));
    const pinnedBids = allBids.filter(bid => bid.pinned);
    if (pinnedBids.length > 0 || anyBidsPinned.value) {
        return pinnedBids;
    }
    return allBids;
});

const anyBidsPinned = computed(() => currentTrackerDataStore.currentBids.some(bid => bid.pinned === true));

const slides = useSlides(() => {
    const result: Slide[] = [
        { component: 'fallback', enabled: computed(() => false), duration: 10 }
    ];

    if (anyBidsPinned.value) {
        result.push(
            { component: 'incentive', enabled: incentivesEnabled, beforeChange: beforeIncentiveShow, duration: 120 },
            { component: 'bidwar', enabled: bidWarsEnabled, beforeChange: beforeBidWarShow, duration: 120 },
            { component: 'donationReminder1', enabled: showDonationReminder, duration: 10 },
            { component: 'donationReminder2', enabled: showDonationReminder, duration: 10 });
    } else {
        result.push(
            { component: 'nextUp', enabled: computed(() => nextScheduleItem.value != null), duration: null },
            { component: 'later', enabled: computed(() => scheduleItemAfterNext.value != null), duration: null },
            { component: 'nextSpeedrun', enabled: computed(() => nextSpeedrun.value != null), duration: null },
            { component: 'milestone', enabled: milestonesEnabled, beforeChange: beforeMilestoneShow, duration: 30 },
            { component: 'incentive', enabled: incentivesEnabled, beforeChange: beforeIncentiveShow, duration: 30 },
            { component: 'bidwar', enabled: bidWarsEnabled, beforeChange: beforeBidWarShow, duration: 30 },
            { component: 'donationReminder1', enabled: showDonationReminder, duration: 10 },
            { component: 'donationReminder2', enabled: showDonationReminder, duration: 10 });
    }

    return result;
});

let manualSlideAdvanceTimeout: number | undefined = undefined;
function onSlideSwitchReady() {
    if (manualSlideAdvanceTimeout == null) {
        manualSlideAdvanceTimeout = window.setTimeout(() => {
            manualSlideAdvanceTimeout = undefined;
            slides.advanceSlide();
        }, 10 * 1000);
    }
}

const slideTitle = computed(() => {
    switch (slides.activeComponent.value) {
        case 'fallback':
            return fallbackSlideTitle;
        case 'nextUp':
            return 'Up Next';
        case 'later':
        case 'nextSpeedrun':
            return 'Later';
        case 'milestone':
            return 'Milestone';
        case 'incentive':
            return 'Incentive';
        case 'bidwar':
            return 'Bid War';
        default:
            return '???';
    }
});
</script>

<style scoped lang="scss">
@use '../../styles/colors';
@use '../../styles/constants';

.omnibar-slides {
    width: 100%;
    padding: 0 8px;
    position: absolute;
    display: flex;
    align-items: center;
    transform: rotate3d(1, 0, 0, 0deg) translateZ(40px) scale(0.98);
    box-sizing: border-box;
}

.omnibar-main-content {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    perspective: 1920px;
    position: relative;
    transform-style: preserve-3d;
    background-color: colors.$vfd-background;
    padding: 0 8px;
    box-sizing: border-box;
}

.slide-title {
    font-weight: 700;
    font-size: 25px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: -2px 8px 0;

    .slide-title-text {
        background-color: colors.$vfd-teal;
        color: colors.$vfd-background;
        padding: 2px 12px;
        text-transform: uppercase;
    }

    .slide-title-icon {
        color: colors.$vfd-teal;
        font-size: 40px;
        margin-top: -4px;
        margin-left: 8px;
    }
}

.slide-content {
    flex-grow: 1;
    overflow: hidden;
    height: 100%;
    position: relative;
    display: flex;
    align-items: center;
    margin-bottom: 4px;
}

.omnibar-donation-reminder {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(to bottom, #93FFFB 0%, #B5FAF7 100%);
    font-size: 40px;
    font-weight: 500;
    text-align: center;
    transform-origin: center;
    transform: rotate3d(1, 0, 0, 0deg) translateZ(40px) scale(0.98);
    opacity: 100%;
    border-color: colors.$layout-gap;
    border-width: 0 2px 0 2px;
    border-style: solid;

    .emphasis {
        color: colors.$vfd-red;
        font-weight: 700;
    }
}

.no-slide-placeholder {
    color: colors.$vfd-teal;
    font-weight: 700;
    text-align: center;
    width: 100%;
    font-size: 35px;
}

.slide-swap-enter-active {
    transition: transform 350ms ease-in-out;
}
.slide-swap-leave-active {
    position: absolute;
    transition: transform 350ms ease-in-out;
}
.slide-swap-leave-from,
.slide-swap-enter-to {
    transform: translateY(0px);
}
.slide-swap-leave-to {
    transform: translateY(constants.$omnibarHeight * -1);
}
.slide-swap-enter-from {
    transform: translateY(constants.$omnibarHeight);
}

.donation-reminder-leave-active {
    position: absolute;
}
.donation-reminder-enter-active,
.donation-reminder-leave-active {
    transition-duration: 500ms;
    transition-property: transform, opacity;
    transition-timing-function: ease-in-out;
}
.donation-reminder-leave-to {
    transform: rotate3d(1, 0, 0, -90deg) translateZ(40px) scale(0.98);
    opacity: 10%;
}
.donation-reminder-enter-from {
    transform: rotate3d(1, 0, 0, 90deg) translateZ(40px) scale(0.98);
    opacity: 10%;
}
</style>
