<template>
    <ipl-space>
        <ipl-message
            v-if="!hasTwitchConfig"
            type="warning"
        >
            Some Twitch configuration is missing.
        </ipl-message>
        <template v-else>
            <div
                v-if="twitchDataStore.twitchData.loggedInUser"
                class="m-b-8"
            >
                Logged in as {{ twitchDataStore.twitchData.loggedInUser.username }}
            </div>
            <ipl-button
                v-if="twitchDataStore.twitchData.state === 'NOT_LOGGED_IN'"
                :href="twitchAuthorizeUrl"
                label="Log in to twitch"
                color="#9146FF"
            />
            <ipl-button
                v-else
                label="Log out"
                color="red"
                @click="logout"
            />
        </template>
    </ipl-space>
    <ipl-space class="m-t-8">
        <div class="title">Title & category sync</div>
        <ipl-toggle
            v-model="enableSync"
            class="m-t-8"
            true-label="enable"
            false-label="disable"
        />
    </ipl-space>
</template>

<script setup lang="ts">
import { IplButton, IplMessage, IplSpace, IplToggle } from '@iplsplatoon/vue-components';
import { computed } from 'vue';
import { Configschema } from 'types/schemas';
import { useTwitchDataStore } from 'client-shared/stores/TwitchDataStore';
import { sendMessage } from 'client-shared/helpers/NodecgHelper';
import { REQUIRED_TWITCH_TOKEN_SCOPES } from 'shared/TwitchHelpers';

const hasTwitchConfig = computed(() => {
    const twitchConfig = (nodecg.bundleConfig as Configschema).twitch;
    return twitchConfig?.redirectUri != null && twitchConfig.clientId != null && twitchConfig.clientSecret != null;
});

const twitchDataStore = useTwitchDataStore();

const twitchAuthorizeUrl = computed(() => {
    if (!hasTwitchConfig.value) return '';
    const twitchConfig = (nodecg.bundleConfig as Configschema).twitch;
    const result = new URL('https://id.twitch.tv/oauth2/authorize');
    result.searchParams.append('client_id', twitchConfig!.clientId!);
    result.searchParams.append('redirect_uri', twitchConfig!.redirectUri!);
    result.searchParams.append('response_type', 'code');
    result.searchParams.append('scope', REQUIRED_TWITCH_TOKEN_SCOPES.join(' '));
    return result.toString();
});

async function logout() {
    await sendMessage('twitch:logout');
}

const enableSync = computed({
    get() {
        return twitchDataStore.twitchData.syncEnabled;
    },
    set(newValue: boolean) {
        twitchDataStore.setSyncEnabled(newValue);
    }
});
</script>
