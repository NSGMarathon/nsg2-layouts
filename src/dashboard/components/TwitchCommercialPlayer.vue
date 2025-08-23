<template>
    <component
        v-if="twitchDataStore.twitchData.state !== 'NOT_LOGGED_IN'"
        :is="collapsible ? IplExpandingSpace : IplSpace"
        :title="collapsible ? 'Play Twitch commercial' : undefined"
        key="twitch-commercial-player"
    >
        <div
            v-if="!collapsible"
            class="title"
        >
            Play Twitch commercial
        </div>
        <div class="m-b-8 m-t-2">
            <template v-if="!!endTimeText">
                Ads end in {{ endTimeText }}
            </template>
            <template v-else-if="!!retryTimeText">
                Ad cooldown: {{ retryTimeText }}
            </template>
            <template v-else>
                Ready to play commercials
            </template>
        </div>
        <ipl-message
            v-if="commercialStartError != null"
            type="error"
            closeable
            @close="commercialStartError = null"
        >
            {{ commercialStartError }}
        </ipl-message>
        <div
            v-else
            class="commercial-button-grid"
        >
            <ipl-button
                small
                label="1:00"
                async
                :disabled="commercialStartDisabled"
                @click="startCommercial(60)"
            />
            <ipl-button
                small
                label="1:30"
                async
                :disabled="commercialStartDisabled"
                @click="startCommercial(90)"
            />
            <ipl-button
                small
                label="2:00"
                async
                :disabled="commercialStartDisabled"
                @click="startCommercial(120)"
            />
            <ipl-button
                small
                label="3:00"
                async
                :disabled="commercialStartDisabled"
                @click="startCommercial(180)"
            />
        </div>
    </component>
</template>

<script setup lang="ts">
import { IplButton, IplExpandingSpace, IplMessage, IplSpace } from '@iplsplatoon/vue-components';
import { useTwitchDataStore } from 'client-shared/stores/TwitchDataStore';
import { computed, ref, watch } from 'vue';
import { DateTime } from 'luxon';
import { sendMessage } from 'client-shared/helpers/NodecgHelper';
import { TwitchCommercialState } from 'types/schemas';

const twitchDataStore = useTwitchDataStore();

const props = withDefaults(defineProps<{
    collapsible: boolean
}>(), {
    collapsible: false
});

const endTimeText = ref('');
const retryTimeText = ref('');
let textUpdateInterval: number | undefined = undefined;

const getDiffNow = (date: string | undefined): string => {
    if (date == null) {
        return '';
    }

    const diffNow = DateTime.fromISO(date).diffNow();
    if (diffNow.milliseconds < 0) {
        return '';
    }
    return diffNow.shiftTo( 'minutes', 'seconds').toHuman({ maximumFractionDigits: 0 });
}

const updateText = (twitchCommercialState: TwitchCommercialState) => {
    endTimeText.value = getDiffNow(twitchCommercialState.endTime);
    retryTimeText.value = getDiffNow(twitchCommercialState.retryTime);
    if (endTimeText.value === '' && retryTimeText.value === '') {
        window.clearInterval(textUpdateInterval);
    }
}

watch(() => twitchDataStore.twitchCommercialState, newValue => {
    window.clearInterval(textUpdateInterval);
    if (newValue.endTime != null || newValue.retryTime != null) {
        updateText(newValue);
        textUpdateInterval = window.setInterval(() => updateText(newValue), 1000);
    }
}, { immediate: true });

const commercialStartDisabled = computed(() => !!endTimeText.value || !!retryTimeText.value);

const commercialStartError = ref<string | null>(null);
async function startCommercial(length: number) {
    try {
        await sendMessage('twitch:startCommercial', { length });
    } catch (e) {
        commercialStartError.value = 'message' in e ? e.message : String(e);
    }
}
</script>

<style lang="scss" scoped>
.commercial-button-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
}
</style>
