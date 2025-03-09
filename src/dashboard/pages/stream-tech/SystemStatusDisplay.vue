<template>
    <ipl-space>
        <div class="title">System status</div>
        <table class="system-status-table max-width">
            <thead>
            <tr>
                <th><img src="../../assets/img/obs-logo.png" title="OBS Studio"></th>
                <th><font-awesome-icon class="icon" icon="music" title="Music" fixed-width /></th>
                <th><font-awesome-icon class="icon" :icon="['fab', 'twitch']" title="Twitch" fixed-width /></th>
                <th><font-awesome-icon class="icon" icon="dollar" title="Tracker" fixed-width /></th>
                <th><img src="../../assets/img/icon-tracker-ws.png" title="Tracker Websocket"></th>
                <th><font-awesome-icon class="icon" icon="volume-high" title="Mixer" fixed-width /></th>
            </tr>
            </thead>
            <tbody>
            <tr>
                <td><div :class="`state-color-${obsState.color}`" :title="`OBS Studio: ${obsState.text}`" /></td>
                <td><div :class="`state-color-${musicState.color}`" :title="`Music: ${musicState.text}`" /></td>
                <td><div :class="`state-color-${twitchState.color}`" :title="`Twitch: ${twitchState.text}`" /></td>
                <td><div :class="`state-color-${trackerLoginStatus.color}`" :title="`Tracker: ${trackerLoginStatus.text}`" /></td>
                <td><div :class="`state-color-${trackerSocketStatus.color}`" :title="`Tracker Websocket: ${trackerSocketStatus.text}`" /></td>
                <td><div :class="`state-color-${mixerStatus.color}`" :title="`Mixer: ${mixerStatus.text}`" /></td>
            </tr>
            </tbody>
        </table>
    </ipl-space>
</template>

<script setup lang="ts">
import { IplSpace } from '@iplsplatoon/vue-components';
import { useObsStore } from 'client-shared/stores/ObsStore';
import { computed } from 'vue';
import { useMusicStore } from 'client-shared/stores/MusicStore';
import { Configschema } from 'types/schemas';
import { useTwitchDataStore } from 'client-shared/stores/TwitchDataStore';
import { useInternalStatusStore } from 'client-shared/stores/InternalStatusStore';
import { useMixerStore } from 'client-shared/stores/MixerStore';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faMusic } from '@fortawesome/free-solid-svg-icons/faMusic';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faTwitch } from '@fortawesome/free-brands-svg-icons/faTwitch';
import { faDollar } from '@fortawesome/free-solid-svg-icons/faDollar';
import { faVolumeHigh } from '@fortawesome/free-solid-svg-icons/faVolumeHigh';

library.add(faMusic, faTwitch, faDollar, faVolumeHigh);

const bundleConfig = nodecg.bundleConfig as Configschema;

const obsStore = useObsStore();
const obsState = computed(() => {
    if (!obsStore.obsState.enabled) {
        return {
            color: 'neutral',
            text: 'Disabled'
        };
    } else {
        switch (obsStore.obsState.status) {
            case 'CONNECTED':
                return {
                    color: 'green',
                    text: 'Connected'
                };
            case 'CONNECTING':
                return {
                    color: 'yellow',
                    text: 'Connecting'
                };
            case 'NOT_CONNECTED':
                return {
                    color: 'red',
                    text: 'Not connected'
                };
        }
    }
});

const musicStore = useMusicStore();
const musicState = computed(() => {
    if (bundleConfig?.foobar2000?.address == null) {
        return {
            color: 'neutral',
            text: 'Not configured'
        };
    } else {
        switch (musicStore.musicState.connectionState) {
            case 'CONNECTED':
                return {
                    color: 'green',
                    text: 'Connected'
                };
            case 'CONNECTING':
                return {
                    color: 'yellow',
                    text: 'Connecting'
                };
            case 'DISCONNECTED':
                return {
                    color: 'red',
                    text: 'Disconnected'
                };
        }
    }
});

const twitchDataStore = useTwitchDataStore();
const twitchState = computed(() => {
    if (bundleConfig?.twitch == null) {
        return {
            color: 'neutral',
            text: 'Not configured'
        };
    } else if (!twitchDataStore.twitchData.syncEnabled) {
        return {
            color: 'neutral',
            text: 'Sync disabled'
        };
    } else {
        switch (twitchDataStore.twitchData.state) {
            case 'AUTHENTICATING':
                return {
                    color: 'yellow',
                    text: 'Authenticating'
                };
            case 'LOGGED_IN':
                return {
                    color: 'green',
                    text: 'Logged in'
                };
            case 'NOT_LOGGED_IN':
                return {
                    color: 'red',
                    text: 'Not logged in'
                };
        }
    }
});

const internalStatusStore = useInternalStatusStore();
const trackerSocketStatus = computed(() => {
    if (bundleConfig?.tracker?.socketAddress == null) {
        return {
            color: 'neutral',
            text: 'Not configured'
        };
    } else {
        switch (internalStatusStore.trackerState.donationSocket) {
            case 'CONNECTED':
                return {
                    color: 'green',
                    text: 'Connected'
                };
            case 'CONNECTING':
                return {
                    color: 'yellow',
                    text: 'Connecting'
                };
            case 'NOT_CONNECTED':
                return {
                    color: 'red',
                    text: 'Not connected'
                };
        }
    }
});
const trackerLoginStatus = computed(() => {
    if (bundleConfig?.tracker?.password == null || bundleConfig?.tracker?.username == null) {
        return {
            color: 'neutral',
            text: 'Not configured'
        };
    } else {
        switch (internalStatusStore.trackerState.login) {
            case 'LOGGED_IN':
                return {
                    color: 'green',
                    text: 'Logged in'
                };
            case 'LOGGING_IN':
                return {
                    color: 'yellow',
                    text: 'Logging in'
                };
            case 'NOT_LOGGED_IN':
                return {
                    color: 'red',
                    text: 'Not logged in'
                };
        }
    }
});

const mixerStore = useMixerStore();
const mixerStatus = computed(() => {
    if (bundleConfig?.x32?.address == null) {
        return {
            color: 'neutral',
            text: 'Not configured'
        };
    } else {
        switch (mixerStore.mixerState.connectionState) {
            case 'CONNECTED':
                return {
                    color: 'green',
                    text: 'Connected'
                };
            case 'CONNECTING':
                return {
                    color: 'yellow',
                    text: 'Connecting'
                };
            case 'NOT_CONNECTED':
                return {
                    color: 'red',
                    text: 'Not connected'
                };
        }
    }
});
</script>

<style scoped lang="scss">
@use '../../styles/dashboard-colors';

.system-status-table {
    td {
        text-align: center;

        > div {
            width: 16px;
            height: 16px;
            border-radius: 99px;
            display: inline-block;
        }
    }

    img {
        width: 1.25em;
        height: 1em;
        object-fit: contain;
        display: inline-block;
    }

    .icon {
        font-size: 16px;
    }
}

.state-color-neutral {
    background-color: #444;
}
.state-color-green {
    background-color: dashboard-colors.$state-green;
}
.state-color-yellow {
    background-color: dashboard-colors.$state-yellow;
}
.state-color-red {
    background-color: dashboard-colors.$state-red;
}
</style>
