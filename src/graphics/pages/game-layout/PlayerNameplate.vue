<template>
    <div
        class="player-nameplate"
        :data-nameplate-index="props.index"
        :style="{
            minHeight: props.fixedHeight ? undefined : `${Math.max(80, Math.min(props.maxConcurrentPlayers, assignmentData?.talent.length ?? 0) * 60 + 16)}px`,
            height: props.fixedHeight ? '80px' : undefined
        }"
    >
        <opacity-swap-transition mode="default">
            <div :key="talentListSlides.activeComponent.value ?? '-1'">
                <div
                    v-for="(talent, i) in chunkedTalentList[Number(talentListSlides.activeComponent.value)]"
                    class="talent-item"
                    :class="{ 'is-compact': useCompactVolumeMeters }"
                    :key="talent.id"
                >
                    <div class="talent-details-anchor">
                        <opacity-swap-transition mode="default">
                            <div
                                class="talent-details"
                                :key="getVisibleName(i).type"
                            >
                                <badge
                                    v-if="disableVolumeMeters || useCompactVolumeMeters"
                                    class="talent-index"
                                >
                                    {{ baseIndex + i + 1 + Number(talentListSlides.activeComponent.value) * props.maxConcurrentPlayers }}
                                </badge>
                                <compact-player-speaking-indicator
                                    v-if="useCompactVolumeMeters"
                                    :player-id="talent.id"
                                    :team-id="assignmentData?.teamId"
                                    class="compact-speaking-indicator"
                                />
                                <fitted-content align="center">
                                    <font-awesome-icon
                                        v-if="getVisibleName(i).type !== 'name'"
                                        :icon="getVisibleName(i).type === 'twitch' ? ['fab', 'twitch'] : ['fab', 'youtube']"
                                        class="name-type-icon"
                                    />
                                    {{ getVisibleName(i).visibleName }}
                                </fitted-content>
                                <badge
                                    v-if="talent.pronouns"
                                    class="talent-pronouns"
                                >
                                    {{ talent.pronouns }}
                                </badge>
                                <country-flag
                                    v-if="talent.countryCode != null"
                                    :country-code="talent.countryCode"
                                    class="talent-country"
                                />
                            </div>
                        </opacity-swap-transition>
                    </div>
                    <player-volume-meter
                        v-if="!disableVolumeMeters && !useCompactVolumeMeters"
                        :talent-id="talent.id"
                        :index="baseIndex + i + 1 + Number(talentListSlides.activeComponent.value) * props.maxConcurrentPlayers"
                        :compact="useCompactVolumeMeters"
                        :team-id="assignmentData?.teamId"
                        class="volume-meter"
                    />
                </div>
            </div>
        </opacity-swap-transition>
    </div>
</template>

<script setup lang="ts">
import { useScheduleStore } from 'client-shared/stores/ScheduleStore';
import { computed, ref, watch } from 'vue';
import { useTalentStore } from 'client-shared/stores/TalentStore';
import { Talent } from 'types/schemas';
import FittedContent from 'components/FittedContent.vue';
import CountryFlag from 'components/CountryFlag.vue';
import Badge from 'components/Badge.vue';
import chunk from 'lodash/chunk';
import { useSlides } from '../../helpers/useSlides';
import OpacitySwapTransition from 'components/OpacitySwapTransition.vue';
import { disableVolumeMeters } from 'client-shared/stores/MixerStore';
import PlayerVolumeMeter from './PlayerVolumeMeter.vue';
import CompactPlayerSpeakingIndicator from './CompactPlayerSpeakingIndicator.vue';
import { cloneDeep } from 'lodash';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faTwitch } from '@fortawesome/free-brands-svg-icons/faTwitch';
import { faYoutube } from '@fortawesome/free-brands-svg-icons/faYoutube';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { isBlank } from 'shared/StringHelper';

library.add(faTwitch, faYoutube);

const props = withDefaults(defineProps<{
    index: number
    maxConcurrentPlayers?: number
    fixedHeight?: boolean
}>(), {
    maxConcurrentPlayers: 2,
    fixedHeight: false
});

const scheduleStore = useScheduleStore();
const talentStore = useTalentStore();

const assignmentData = computed<{ teamId?: string, talent: Talent } | null>(() => {
    const assignments = scheduleStore.playerNameplateAssignments[props.index];
    if (assignments == null) return null;
    return {
        teamId: assignments.teamId,
        talent: assignments.playerIds.map(playerId => talentStore.findTalentItemById(playerId)).filter(talent => talent != null)
    };
});
const chunkedTalentList = computed<Talent[]>(() => assignmentData.value == null ? [] : chunk(assignmentData.value.talent, props.maxConcurrentPlayers));

type VisibleTalentName = { talentId: string, visibleName: string, type: 'name' | 'twitch' | 'youtube', isFirstDisplay: boolean };
const visibleTalentListNames = ref<VisibleTalentName[]>([]);
function getVisibleName(talentIndex: number): VisibleTalentName {
    return visibleTalentListNames.value[Number(talentListSlides.activeComponent.value) * props.maxConcurrentPlayers + talentIndex];
}
watch(assignmentData, newValue => {
    if (newValue == null) {
        visibleTalentListNames.value = [];
        return;
    }
    visibleTalentListNames.value = newValue.talent.map(talentItem => {
        const existingItem = visibleTalentListNames.value.find(existingTalentNameItem => existingTalentNameItem.talentId === talentItem.id);
        return existingItem ?? { talentId: talentItem.id, visibleName: talentItem.name, type: 'name', isFirstDisplay: true };
    });
}, { immediate: true });

function beforeTalentSlideSwap(component: string) {
    const talentChunkIndex = Number(component);
    const talentListChunk = chunkedTalentList.value[talentChunkIndex];
    const newVisibleNames = cloneDeep(visibleTalentListNames.value);
    talentListChunk.forEach((talentItem, i) => {
        const visibleName = newVisibleNames[talentChunkIndex * props.maxConcurrentPlayers + i];
        if (visibleName.isFirstDisplay) {
            visibleName.isFirstDisplay = false;
            return;
        }
        if (visibleName.type === 'name') {
            if (!isBlank(talentItem.socials.twitch)) {
                visibleName.type = 'twitch';
                visibleName.visibleName = `/${talentItem.socials.twitch}`;
            } else if (!isBlank(talentItem.socials.youtube)) {
                visibleName.type = 'youtube';
                visibleName.visibleName = talentItem.socials.youtube!;
            }
        } else {
            visibleName.type = 'name';
            visibleName.visibleName = talentItem.name;
        }
    });
    visibleTalentListNames.value = newVisibleNames;
}

const talentListSlides = useSlides(() => chunkedTalentList.value.map((_, i) => ({ component: String(i), duration: 12, beforeChange: beforeTalentSlideSwap })));

const baseIndex = computed(() => scheduleStore.playerNameplateAssignments
    .slice(0, props.index)
    .reduce((result, assignments) => {
        result += assignments.playerIds.length;
        return result;
    }, 0));

const useCompactVolumeMeters = computed(() => props.fixedHeight && (assignmentData.value?.talent.length ?? 0) > 1);
</script>

<style scoped lang="scss">
@use '../../styles/colors';

.player-nameplate {
    color: colors.$vfd-teal;
    background-color: colors.$vfd-background;
    text-align: center;
    font-size: 30px;
    font-weight: 700;
    box-sizing: border-box;
    overflow: hidden;
    position: relative;

    > div {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        min-height: 64px;
        height: 100%;
        width: 100%;
        overflow: hidden;
        padding: 4px 0;
    }
}

.talent-item {
    padding: 0 8px;
    width: 100%;
    overflow: hidden;
    box-sizing: border-box;
    display: grid;
    grid-auto-flow: row;
    grid-auto-rows: 1fr;
    height: 60px;

    &.is-compact {
        height: 36px;
    }

    > .talent-details-anchor {
        position: relative;
    }

    .talent-details {
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        position: absolute;
        z-index: 2;
    }

    > .volume-meter {
        height: 18px;
        max-width: 400px;
        width: 100%;
        margin-top: 4px;
        justify-self: center;
        align-self: center;

        &.compact {
            position: absolute;
            height: 25px;
        }
    }
}

.name-type-icon {
    font-size: 22px;
    transform: translate(2px, -2px);
}

.talent-country, .talent-pronouns {
    margin-left: 8px;
    font-size: 20px;
}

.talent-country {
    height: 25.5px;
}

.talent-index {
    font-size: 18px;
    min-width: 18px;
    height: 20px;
    line-height: 19px;
    text-align: center;
    font-weight: 600;
    margin-right: 0;
}

.talent-index + *:not(.compact-speaking-indicator) {
    margin-right: 6px;
}

.compact-speaking-indicator {
    margin-right: 6px;
}
</style>
