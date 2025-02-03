<template>
    <div
        class="player-nameplate"
        :data-nameplate-index="props.index"
        :style="{
            minHeight,
            height: props.fixedHeight ? '80px' : undefined
        }"
    >
        <opacity-swap-transition mode="default">
            <div :key="activeTalentListChunk ?? '-1'">
                <div
                    v-if="assignmentData?.teamName != null && assignmentData?.talent.length === 0"
                    class="talent-item team-name"
                    :class="{ 'is-compact': useCompactTalentItems }"
                    key="team-name"
                >
                    <div class="talent-details-anchor">
                        <div class="talent-details">
                            <fitted-content
                                align="center"
                                class="talent-name"
                            >
                                {{ assignmentData.teamName }}
                            </fitted-content>
                        </div>
                    </div>
                    <player-volume-meter
                        v-if="!disableVolumeMeters && !useCompactTalentItems"
                        :index="baseIndex + 1"
                        :team-id="assignmentData?.teamId"
                        class="volume-meter"
                    />
                </div>
                <div
                    v-for="(talent, i) in chunkedTalentList[activeTalentListChunk]"
                    class="talent-item"
                    :class="{ 'is-compact': useCompactTalentItems }"
                    :key="talent.id"
                >
                    <div class="talent-details-anchor">
                        <opacity-swap-transition mode="default">
                            <div
                                class="talent-details"
                                :key="isBlank(talent.socialType) ? 'name' : playerNameplateMode"
                            >
                                <badge
                                    v-if="disableVolumeMeters || useCompactTalentItems"
                                    class="talent-index"
                                >
                                    {{ baseIndex + i + 1 + activeTalentListChunk * props.maxConcurrentPlayers }}
                                </badge>
                                <compact-player-speaking-indicator
                                    v-if="useCompactTalentItems"
                                    :player-id="talent.id"
                                    :team-id="assignmentData?.teamId"
                                    class="compact-speaking-indicator"
                                />
                                <fitted-content align="center">
                                    <span
                                        v-if="assignmentData?.teamName != null"
                                        class="talent-team-name"
                                    >
                                        {{ assignmentData.teamName }}:
                                    </span>
                                    <font-awesome-icon
                                        v-if="playerNameplateMode === 'social' && !isBlank(talent.socialType)"
                                        :icon="talent.socialType === 'twitch' ? ['fab', 'twitch'] : ['fab', 'youtube']"
                                        class="name-type-icon"
                                    />
                                    <template v-if="playerNameplateMode === 'name' || isBlank(talent.socialType)">
                                        {{ talent.name }}
                                    </template>
                                    <template v-else>
                                        /{{ talent.social }}
                                    </template>
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
                        v-if="!disableVolumeMeters && !useCompactTalentItems"
                        :talent-id="talent.id"
                        :index="baseIndex + i + 1 + activeTalentListChunk * props.maxConcurrentPlayers"
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
import { computed, inject, ref, watch } from 'vue';
import { useTalentStore } from 'client-shared/stores/TalentStore';
import { Talent } from 'types/schemas';
import FittedContent from 'components/FittedContent.vue';
import CountryFlag from 'components/CountryFlag.vue';
import Badge from 'components/Badge.vue';
import chunk from 'lodash/chunk';
import OpacitySwapTransition from 'components/OpacitySwapTransition.vue';
import { disableVolumeMeters } from 'client-shared/stores/MixerStore';
import PlayerVolumeMeter from './PlayerVolumeMeter.vue';
import CompactPlayerSpeakingIndicator from './CompactPlayerSpeakingIndicator.vue';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faTwitch } from '@fortawesome/free-brands-svg-icons/faTwitch';
import { faYoutube } from '@fortawesome/free-brands-svg-icons/faYoutube';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { isBlank } from 'shared/StringHelper';
import { GameLayoutFeedIndexInjectionKey, PlayerNameplateModeInjectionKey } from '../../helpers/Injections';

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

const feedIndex = inject(GameLayoutFeedIndexInjectionKey, 0);

type NormalizedTalentList = { id: string, name: string, social?: string, socialType?: string, pronouns?: string | null, countryCode?: string | null }[];

function normalizeTalentList(talent: Talent): NormalizedTalentList {
    return talent.map(talentItem => {
        let socialData: { social?: string, socialType?: string } = {};
        if (!isBlank(talentItem.socials.twitch)) {
            socialData = {
                socialType: 'twitch',
                social: talentItem.socials.twitch!
            };
        } else if (!isBlank(talentItem.socials.youtube)) {
            socialData = {
                socialType: 'youtube',
                social: talentItem.socials.youtube!
            };
        }

        return {
            id: talentItem.id,
            name: talentItem.name,
            ...socialData,
            pronouns: talentItem.pronouns,
            countryCode: talentItem.countryCode
        };
    })
}

const assignmentData = computed<{ teamId?: string, teamName?: string, talent: NormalizedTalentList } | null>(() => {
    const assignments = scheduleStore.playerNameplateAssignments[feedIndex].assignments[props.index];
    if (assignments == null) return null;
    const assignedTeam = assignments.teamId == null ? null : scheduleStore.activeSpeedrun?.teams.find(team => team.id === assignments.teamId);
    if (!isBlank(assignedTeam?.name)) {
        const multipleNameplatesAssignedToTeam = scheduleStore.playerNameplateAssignments[feedIndex].assignments.filter(otherAssignment => assignments.teamId === otherAssignment.teamId).length > 1;

        return {
            teamId: assignedTeam!.id,
            teamName: assignedTeam!.name,
            talent: normalizeTalentList(scheduleStore.activeSpeedrun?.relay || multipleNameplatesAssignedToTeam
                ? assignments.playerIds.map(playerId => talentStore.findTalentItemById(playerId)).filter(talent => talent != null)
                : [])
        };
    }
    return {
        teamId: assignments.teamId,
        talent: normalizeTalentList(assignments.playerIds.map(playerId => talentStore.findTalentItemById(playerId)).filter(talent => talent != null))
    };
});

const useCompactTalentItems = computed(() => {
    if (!props.fixedHeight) return false;
    return (chunkedTalentList.value[activeTalentListChunk.value]?.length ?? 0) > 1;
});

const minHeight = computed(() => {
    if (props.fixedHeight) return undefined;

    if (assignmentData.value?.teamName != null) {
        return '80px';
    } else {
        return `${Math.max(80, Math.min(props.maxConcurrentPlayers, assignmentData.value?.talent.length ?? 0) * 60 + 16)}px`;
    }
});

const chunkedTalentList = computed(() => assignmentData.value == null ? [] : chunk(assignmentData.value.talent, props.maxConcurrentPlayers));

const activeTalentListChunk = ref(0);
const playerNameplateMode = inject(PlayerNameplateModeInjectionKey)!;
watch(chunkedTalentList, (newValue, oldValue) => {
    if (newValue.length !== oldValue.length) {
        activeTalentListChunk.value = 0;
    }
});
watch(() => scheduleStore.playerNameplateAssignments[feedIndex].assignments, (newValue, oldValue) => {
    if (
        newValue.length !== oldValue.length
        || newValue.some((assignment, i) => oldValue[i].playerIds.length !== assignment.playerIds.length)
    ) {
        activeTalentListChunk.value = 0;
    }
});
watch(playerNameplateMode, newValue => {
    if (newValue === 'name') {
        activeTalentListChunk.value = activeTalentListChunk.value === chunkedTalentList.value.length - 1 ? 0 : activeTalentListChunk.value + 1;
    }
});

const baseIndex = computed(() => scheduleStore.playerNameplateAssignments[feedIndex].assignments
    .slice(0, props.index)
    .reduce((result, assignments) => {
        // If a named team only has a single nameplate, that nameplate displays only one name.
        // Otherwise, each member of the team is shown individually.
        if (
            assignments.teamId != null
            && !isBlank(scheduleStore.activeSpeedrun?.teams.find(team => team.id === assignments.teamId)?.name)
            && scheduleStore.playerNameplateAssignments[feedIndex].assignments.filter(otherAssignments => assignments.teamId === otherAssignments.teamId).length === 1
        ) {
            result += 1;
        } else {
            result += assignments.playerIds.length;
        }
        return result;
    }, 0));
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

    &.team-name {
        font-weight: 600;
    }

    &.is-compact {
        height: 36px;
    }

    > .talent-details-anchor {
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: center;
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

    .talent-team-name {
        font-weight: 500;
        font-family: 'Roboto Condensed', sans-serif;
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
