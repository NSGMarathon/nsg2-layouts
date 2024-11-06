<template>
    <div class="intermission-schedule bg-inset">
        <div class="title">
            <span>Next Up</span>
        </div>
        <template
            v-for="(item, i) in nextScheduleItems"
        >
            <div class="schedule-item layout horizontal center-vertical">
                <template v-if="item != null">
                    <div
                        v-if="i > 0"
                        class="schedule-item-time-delta layout horizontal"
                    >
                        <div class="in">IN</div>
                        <seven-segment-digits
                            :digit-count="2"
                            :value="scheduleItemTimeDeltas[i - 1] >= 60 ? Math.round(scheduleItemTimeDeltas[i - 1] / 60) : scheduleItemTimeDeltas[i - 1]"
                            class="delta-digits"
                        />
                        <div class="m-l-2">
                            <div class="unit" :class="{ lit: scheduleItemTimeDeltas[i - 1] < 60 }">MIN</div>
                            <div class="unit" :class="{ lit: scheduleItemTimeDeltas[i - 1] >= 60 }">HR<span :class="{ unlit: Math.round(scheduleItemTimeDeltas[i - 1] / 60) === 1 }">S</span></div>
                        </div>
                    </div>
                    <div class="layout vertical center-vertical grow">
                        <vfd-pixel-text
                            :font-size="27"
                            :text-content="item.title"
                        />
                        <div
                            v-if="item.type === 'SPEEDRUN' || item.talentIds.length > 0"
                            class="layout horizontal"
                        >
                            <template v-if="item.type === 'SPEEDRUN'">
                                <div class="max-width m-t-4">
                                    <vfd-pixel-text
                                        :font-size="22"
                                        :text-content="talentStore.formatSpeedrunTeamList(item.teams)"
                                    />
                                    <vfd-pixel-text
                                        :font-size="22"
                                        :text-content="item.category"
                                    />
                                </div>
                                <speedrun-estimate-display
                                    :estimate="item.estimate"
                                    class="estimate-display"
                                />
                            </template>
                            <vfd-pixel-text
                                v-else
                                :font-size="22"
                                :text-content="talentStore.formatTalentIdList(item.talentIds, 4)"
                                class="max-width m-t-4"
                            />
                        </div>
                    </div>
                </template>
            </div>
            <div class="separator" />
        </template>
        <div class="schedule-notes layout vertical center-vertical center-horizontal max-width">
            <div class="m-b-8">Times are approximate.</div>
            <div class="layout horizontal center-vertical">
                <div class="full-schedule-label">Full Schedule</div>
                <div class="full-schedule-pointer-icon m-x-8">»</div>
                <div class="full-schedule-link">schedule.nsgmarathon.com</div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useScheduleStore } from 'client-shared/stores/ScheduleStore';
import { computed, ref, watchEffect } from 'vue';
import { ScheduleItem } from 'types/ScheduleHelpers';
import { useTimerStore } from 'client-shared/stores/TimerStore';
import VfdPixelText from 'components/VfdPixelText.vue';
import { useTalentStore } from 'client-shared/stores/TalentStore';
import SpeedrunEstimateDisplay from 'components/SpeedrunEstimateDisplay.vue';
import { Duration } from 'luxon';
import SevenSegmentDigits from 'components/SevenSegmentDigits.vue';
import { Configschema } from 'types/schemas';

const addCameraSpace = (nodecg.bundleConfig as Configschema).intermission?.addCameraSpace ?? true;
const maxScheduleItemCount = addCameraSpace ? 4 : 6;

const scheduleStore = useScheduleStore();
const timerStore = useTimerStore();
const talentStore = useTalentStore();

// When seeking to the next speedrun, the timer state may be reset before or after the active speedrun is changed.
// If the timer state is reset before the active speedrun is switched, the schedule may briefly flash an incorrect state before switching to the correct one.
// Due to this, we wait 50ms before fully committing to a schedule update to ensure no other state updates come in within that timeframe.
let scheduleUpdateTimeout: number | undefined = undefined;
const nextScheduleItems = ref<(ScheduleItem | null)[]>([null, null, null, null]);
watchEffect(() => {
    if (scheduleStore.activeSpeedrunIndex === -1) return [];

    let newNextScheduleItems: ScheduleItem[] = [];
    const interstitials: ScheduleItem[] = scheduleStore.interstitialsBeforeActiveRun.filter(interstitial => !interstitial.completed);
    if (interstitials.length >= maxScheduleItemCount) {
        newNextScheduleItems = interstitials.slice(0, maxScheduleItemCount);
    }
    if (timerStore.timer.state === 'FINISHED') {
        newNextScheduleItems = interstitials
            .concat(scheduleStore.schedule.items.slice(scheduleStore.activeSpeedrunIndex + 1, scheduleStore.activeSpeedrunIndex + 1 + maxScheduleItemCount - interstitials.length));
    } else {
        newNextScheduleItems = interstitials
            .concat(scheduleStore.activeSpeedrun!)
            .concat(scheduleStore.schedule.items.slice(scheduleStore.activeSpeedrunIndex + 1, scheduleStore.activeSpeedrunIndex + maxScheduleItemCount - interstitials.length));
    }
    if (newNextScheduleItems.length !== maxScheduleItemCount) {
        newNextScheduleItems = Array.from({ length: maxScheduleItemCount }, (_, i) => newNextScheduleItems[i] ?? null);
    }

    clearTimeout(scheduleUpdateTimeout);
    scheduleUpdateTimeout = window.setTimeout(() => nextScheduleItems.value = newNextScheduleItems, 50);
});

const scheduleItemTimeDeltas = computed(() => {
     let minutes = 0;
     const result: number[] = [];
     nextScheduleItems.value.forEach(scheduleItem => {
         if (scheduleItem == null) {
             result.push(minutes);
             return;
         }
         const parsedEstimate = Duration.fromISO(scheduleItem.estimate).shiftTo('minutes');
         const parsedSetupTime = Duration.fromISO(scheduleItem.setupTime ?? 'PT0M').shiftTo('minutes');
         minutes += parsedEstimate.minutes + parsedSetupTime.minutes;
         result.push(minutes);
     });
     return result;
});
</script>

<style scoped lang="scss">
@use '../../styles/colors';

.intermission-schedule {
    padding: 12px;
}

.title {
    width: 100%;
    margin-bottom: 12px;

    span {
        color: colors.$vfd-background;
        background-color: colors.$vfd-red;
        font-weight: 700;
        text-transform: uppercase;
        font-size: 25px;
        padding: 2px 12px;
    }
}

.separator {
    width: 80%;
    height: 2px;
    background-color: colors.$vfd-teal;
    margin: 16px 0 16px 10%;
}

.schedule-item {
    min-height: 90px;
}

.estimate-display {
    font-size: 1.2em;
}

.schedule-notes {
    color: colors.$vfd-teal;
    font-size: 28px;
    font-weight: 500;
    margin-top: -4px;
}

.full-schedule-pointer-icon {
    font-size: 42px;
    line-height: 35px;
    margin-top: -6px;
    font-weight: 400;
}

.full-schedule-label {
    color: colors.$vfd-background;
    background-color: colors.$vfd-teal;
    font-weight: 700;
    padding: 1px 12px;
    text-transform: uppercase;
    font-size: 25px;
}

.schedule-item-time-delta {
    width: 152px;
    align-items: flex-end;
    font-size: 22px;
    font-weight: 700;
    margin-left: 8px;

    .delta-digits {
        font-size: 44px;
    }

    .in {
        color: colors.$vfd-teal;
        margin-bottom: -2px;
        margin-right: 2px;
    }

    .unit {
        color: colors.$vfd-teal-unlit;
        transform: translateY(3.5px);
        font-size: 24px;
        line-height: 26px;

        &.lit {
            color: colors.$vfd-teal;
        }

        > .unlit {
            color: colors.$vfd-teal-unlit;
        }
    }
}
</style>
