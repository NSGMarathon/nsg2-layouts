<template>
    <div class="other-nameplate-grid">
        <table>
            <tbody>
                <tr
                    v-for="(talentRow, i) in talent"
                    :key="i"
                >
                    <td
                        v-for="(talent, j) in talentRow"
                        :key="talent?.id ?? j"
                        :class="{ speaking: mixerStore.isSpeaking(talent?.id, null) }"
                    >
                        <template v-if="talent != null">
                            <fitted-content
                                class="commentator-name"
                                align="center"
                            >
                                {{ talent.name }}
                            </fitted-content>
                            <div class="layout horizontal center-horizontal center-vertical m-t-2 m-x-4">
                                <country-flag
                                    v-if="talent.countryCode != null"
                                    :country-code="talent.countryCode"
                                    class="commentator-flag"
                                />
                                <fitted-content class="commentator-pronoun-wrapper">
                                    <badge
                                        v-if="!isBlank(talent.pronouns)"
                                        class="commentator-pronouns"
                                    >
                                        {{ talent.pronouns }}
                                    </badge>
                                </fitted-content>
                            </div>
                        </template>
                        <div class="cell-index">{{ talentStore.currentHostId != null && talent?.id === talentStore.currentHostId ? 'H' : i * rowCount + j + 1 + baseIndex }}</div>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script setup lang="ts">
import { useScheduleStore } from 'client-shared/stores/ScheduleStore';
import { computed, inject } from 'vue';
import { useTalentStore } from 'client-shared/stores/TalentStore';
import chunk from 'lodash/chunk';
import { TalentItem } from 'types/ScheduleHelpers';
import FittedContent from 'components/FittedContent.vue';
import CountryFlag from 'components/CountryFlag.vue';
import { isBlank } from 'shared/StringHelper';
import Badge from 'components/Badge.vue';
import { useMixerStore } from 'client-shared/stores/MixerStore';
import { GameLayoutFeedIndexInjectionKey } from '../../helpers/Injections';
import { useSpeedrunPlaylistStore } from 'client-shared/stores/SpeedrunPlaylistStore';

const scheduleStore = useScheduleStore();
const talentStore = useTalentStore();
const mixerStore = useMixerStore();
const speedrunPlaylistStore = useSpeedrunPlaylistStore();

const columnCount = 2;
const rowCount = 2;
const feedIndex = inject(GameLayoutFeedIndexInjectionKey, 0);

const baseIndex = computed(() => scheduleStore.playerNameplateAssignments[feedIndex].assignments.reduce((result, assignment) => {
    if (scheduleStore.getNameplateGlobalTeamName(feedIndex, assignment) != null) {
        result += 1;
    } else {
        result += assignment.players.length;
    }
    return result;
}, 0));
const talent = computed(() => {
    const result: (TalentItem | null)[] = [
        ...((scheduleStore.activeSpeedrun?.commentatorIds ?? [])).map(commentatorId => commentatorId.id),
        speedrunPlaylistStore.speedrunPlaylistState.isRunning ? null : talentStore.currentHostId
    ]
        .map(talentId => talentStore.findTalentItemById(talentId))
        .filter(talent => talent != null) ?? [];
    if (result.length % columnCount > 0 || result.length === 0) {
        result.push(...Array.from({ length: (result.length === 0) ? columnCount : (result.length % columnCount) }, () => null));
    }
    return chunk(result, columnCount);
});
</script>

<style scoped lang="scss">
@use 'sass:color';
@use '../../styles/decorations';
@use '../../styles/colors';

.other-nameplate-grid {
    @include decorations.inset-container;

    padding: 8px;
    color: colors.$vfd-teal;
}

table {
    width: 100%;
    height: 100%;
    border-collapse: collapse;
    table-layout: fixed;

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

.commentator-name {
    margin: 2px 4px 0;
    font-size: 22px;
    font-weight: 700;
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
</style>
