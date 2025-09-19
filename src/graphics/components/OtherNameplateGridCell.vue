<template>
    <td ref="cell">
        <template v-if="props.talent != null">
            <fitted-content
                class="commentator-name"
                align="center"
            >
                {{ props.talent.name }}
            </fitted-content>
            <div class="layout horizontal center-horizontal center-vertical m-t-2 m-x-4">
                <country-flag
                    v-if="props.talent.countryCode != null"
                    :country-code="props.talent.countryCode"
                    class="commentator-flag"
                />
                <fitted-content class="commentator-pronoun-wrapper">
                    <badge
                        v-if="!isBlank(props.talent.pronouns)"
                        class="commentator-pronouns"
                    >
                        {{ props.talent.pronouns }}
                    </badge>
                </fitted-content>
            </div>
        </template>
        <div class="cell-index">{{ props.cellIndex }}</div>
    </td>
</template>

<script setup lang="ts">
import { isBlank } from 'shared/StringHelper';
import Badge from 'components/Badge.vue';
import CountryFlag from 'components/CountryFlag.vue';
import FittedContent from 'components/FittedContent.vue';
import { TalentItem } from 'types/ScheduleHelpers';
import { defaultSpeakingThreshold, useMixerStore } from 'client-shared/stores/MixerStore';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { CHANNEL_LEVEL_EXPONENT, useExperimentalAccurateChannelMeters } from 'client-shared/helpers/MixerHelper';
import { useTalentStore } from 'client-shared/stores/TalentStore';

const mixerStore = useMixerStore();
const talentStore = useTalentStore();

const cell = ref<HTMLTableCellElement>();

const props = defineProps<{
    talent?: TalentItem | null
    cellIndex: string | number
}>();

const channelAssignment = computed(() => {
    if (props.talent == null) return null;

    return props.talent.id === talentStore.currentHostId
        ? mixerStore.mixerChannelAssignments.host
        : mixerStore.mixerChannelAssignments.speedrunTalent[props.talent.id];
});

let alive = true;
onMounted(() => {
    let lastTime = 0;
    let currentLevel = 0;
    let targetLevel = 0;

    watch(() => {
        if (channelAssignment.value == null) {
            return [-90, defaultSpeakingThreshold];
        } else {
            return [
                mixerStore.mixerChannelLevels[channelAssignment.value.channelId] ?? -90,
                channelAssignment.value.speakingThresholdDB ?? defaultSpeakingThreshold
            ];
        }
    }, ([channelLevel, speakingThreshold]) => {
        targetLevel = useExperimentalAccurateChannelMeters
            ? channelLevel > speakingThreshold ? (channelLevel + 90) / 100 : 0
            : channelLevel > speakingThreshold ? ((channelLevel + 90) / 100) ** (1 / CHANNEL_LEVEL_EXPONENT) : 0;
    }, { immediate: true });

    const redraw = (time: number) => {
        if (!alive) {
            return;
        }
        const deltaTime = time - lastTime;
        lastTime = time;
        if (currentLevel > targetLevel) {
            currentLevel = Math.max(targetLevel, currentLevel - deltaTime / 350 );
        } else if (currentLevel < targetLevel) {
            currentLevel = Math.min(targetLevel, currentLevel + deltaTime);
        }

        cell.value!.style.backgroundColor = `rgba(153, 251, 249, ${(currentLevel) * 0.75})`;

        requestAnimationFrame(redraw);
    };

    redraw(0);
});

onUnmounted(() => {
    alive = false;
});
</script>

<style scoped lang="scss">
@use 'sass:color';
@use '../styles/colors';

td {
    border: 2px solid colors.$vfd-teal;
    height: 60px;
    text-align: center;
    position: relative;
    padding: 0;
    background-color: transparent;
    transition: background-color 150ms;

    &.speaking {
        background-color: color.adjust(colors.$vfd-teal, $alpha: -0.8);
    }
}

.commentator-name {
    margin: 2px 4px 0;
    font-size: 22px;
    font-weight: 700;
    color: colors.$vfd-teal;
}

.commentator-flag {
    height: 22px;
}

.commentator-flag + .commentator-pronoun-wrapper {
    margin-left: 4px;
}

.commentator-pronouns {
    font-size: 17.5px !important;
    transform: translateY(-0.5px);
}

.cell-index {
    position: absolute;
    bottom: -2px;
    left: -2px;
    background-color: colors.$vfd-teal;
    font-family: 'Roboto Condensed';
    font-weight: 600;
    font-size: 20px;
    color: colors.$vfd-background;
    min-width: 18px;
    height: 20px;
    line-height: 21px;
    text-align: center;
}
</style>
