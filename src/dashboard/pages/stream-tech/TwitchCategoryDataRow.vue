<template>
    <ipl-data-row label="Twitch category">
        <span :class="{ 'missing-value': props.twitchCategory?.name == null }">
            <a
                v-if="props.twitchCategory?.igdbUrl != null"
                :href="props.twitchCategory.igdbUrl"
                target="_blank"
            >
                {{ props.twitchCategory?.name ?? 'N/A' }}
            </a>
            <template v-else>
                {{ props.twitchCategory?.name ?? 'N/A' }}
            </template>
            <font-awesome-icon class="warning-icon" icon="triangle-exclamation" fixed-width />
        </span>
    </ipl-data-row>
</template>

<script setup lang="ts">
import { Speedrun } from 'types/schemas';
import { IplDataRow } from '@iplsplatoon/vue-components';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

const props = defineProps<{
    twitchCategory?: Speedrun['twitchCategory']
}>();
</script>

<style scoped lang="scss">
@use '../../styles/dashboard-colors';

.warning-icon {
    display: none;
    margin-left: 4px;
}

.missing-value {
    color: dashboard-colors.$state-yellow;

    .warning-icon {
        display: unset;
    }
}
</style>
