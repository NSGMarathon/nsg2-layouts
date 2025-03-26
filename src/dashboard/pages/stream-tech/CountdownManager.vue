<template>
    <ipl-expanding-space
        title="Countdown"
    >
        <ipl-input
            v-model="countdownMessage"
            label="Message"
            name="message"
        />
        <div
            class="layout horizontal center-vertical"
            style="max-width: 150px; margin: 8px auto 0"
        >
            <ipl-input
                v-model="hours"
                name="hours"
                centered
                :formatter="hourFormatter"
                :disabled="countdownStore.countdownData.running"
            />
            :
            <ipl-input
                v-model="minutes"
                name="minutes"
                centered
                :formatter="minuteSecondFormatter"
                :disabled="countdownStore.countdownData.running"
            />
            :
            <ipl-input
                v-model="seconds"
                name="seconds"
                centered
                :formatter="minuteSecondFormatter"
                :disabled="countdownStore.countdownData.running"
            />
        </div>
        <ipl-button
            class="m-t-8"
            label="Update"
            @click="update"
        />
        <div class="m-t-8 layout horizontal">
            <ipl-button
                color="green"
                :disabled="countdownStore.countdownData.running"
                @click="countdownStore.setCountdownRunning(true)"
            >
                <font-awesome-icon icon="play" /> Start
            </ipl-button>
            <ipl-button
                color="red"
                class="m-l-8"
                :disabled="!countdownStore.countdownData.running"
                @click="countdownStore.setCountdownRunning(false)"
            >
                <font-awesome-icon icon="stop" /> Stop
            </ipl-button>
        </div>
    </ipl-expanding-space>
</template>

<script setup lang="ts">
import { IplButton, IplExpandingSpace, IplInput } from '@iplsplatoon/vue-components';
import { useCountdownStore } from 'client-shared/stores/CountdownStore';
import { computed, ref, watch } from 'vue';
import { updateRefOnValueChange } from 'client-shared/helpers/StoreHelper';
import { DateObjectUnits, Duration, DurationUnit } from 'luxon';
import { padNumber } from 'client-shared/helpers/StringHelper';
import { DurationObjectUnits } from 'luxon';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faPlay } from '@fortawesome/free-solid-svg-icons/faPlay';
import { faStop } from '@fortawesome/free-solid-svg-icons/faStop';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

library.add(faPlay, faStop);

const countdownStore = useCountdownStore();

const countdownMessage = ref('');
updateRefOnValueChange(() => countdownStore.countdownData.messageText, countdownMessage);

function getNumberFormatter(max?: number): (value: string) => string {
    return (value: string) => {
        if (value === '') return '';

        const parsedValue = parseInt(value);
        if (isNaN(parsedValue) || parsedValue < 0) return '00';
        if (max != null && parsedValue > max) return max.toString();

        return padNumber(value);
    };
}

const hourFormatter = getNumberFormatter();
const minuteSecondFormatter = getNumberFormatter(59);

const unitGetter = (getterUnit: keyof DurationObjectUnits, setterUnit: DurationUnit, padResult = true) => computed({
    get() {
        return padResult ? padNumber(timerDuration.value?.[getterUnit]) : String(timerDuration.value?.[getterUnit]);
    },
    set(value: string) {
        const newValue = parseInt(value);
        if (!isNaN(newValue)) {
            updateTime({ [setterUnit]: newValue });
        }
    }
});
const hours = unitGetter('hours', 'hours', false);
const minutes = unitGetter('minutes', 'minutes');
const seconds = unitGetter('seconds', 'seconds');

const timerDuration = ref<Duration | null>(null);
watch(() => countdownStore.countdownTimer, newValue => {
    timerDuration.value = Duration.fromMillis(newValue).shiftTo('seconds', 'minutes', 'hours', 'milliseconds');
}, { immediate: true });

function updateTime(values: DateObjectUnits): void {
    timerDuration.value = timerDuration.value?.set(values)!.shiftTo('seconds', 'minutes', 'hours', 'milliseconds')!;
}

function update() {
    countdownStore.setCountdownMessage(countdownMessage.value);
    if (!countdownStore.countdownData.running && timerDuration.value != null) {
        countdownStore.setCountdownTimer(timerDuration.value.shiftTo('milliseconds').milliseconds);
    }
}
</script>
