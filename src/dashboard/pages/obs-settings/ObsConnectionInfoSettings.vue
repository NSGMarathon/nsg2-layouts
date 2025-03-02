<template>
    <ipl-space style="max-width: 272px; margin: 0 auto;">
        <div class="title">OBS Socket</div>
        <ipl-toggle
            v-model="socketEnabled"
            true-label="Enabled"
            false-label="Disabled"
        />
    </ipl-space>
    <ipl-space
        v-if="socketEnabled"
        class="m-t-8"
        style="max-width: 272px; margin: 8px auto 0 auto;"
    >
        <ipl-input
            v-model="socketUrl"
            name="socketUrl"
            label="Socket address"
            class="m-b-4"
        />
        <ipl-input
            v-model="socketPassword"
            name="password"
            type="password"
            label="Password (Optional)"
        />
        <ipl-button
            label="Connect"
            class="m-t-8"
            :disabled="!allValid"
            :color="isChanged ? 'red' : 'blue'"
            async
            progress-message="Connecting..."
            success-message="Connected!"
            @click="connect"
        />
        <ipl-space
            class="text-center m-t-8 status-display"
            :class="`obs-status_${obsStore.obsState.status}`"
        >
            {{ statusText }}
        </ipl-space>
    </ipl-space>
    <ipl-message
        v-else
        type="info"
        class="m-t-8"
    >
        The OBS websocket is disabled.
    </ipl-message>
</template>

<script setup lang="ts">
import {
    IplButton,
    IplInput,
    IplMessage,
    IplSpace,
    IplToggle, notBlank,
    provideValidators,
    validator
} from '@iplsplatoon/vue-components';
import { useObsStore } from 'client-shared/stores/ObsStore';
import { useErrorHandlerStore } from '../../helpers/ErrorHandlerStore';
import { computed, ref } from 'vue';
import { updateRefOnValueChange } from 'client-shared/helpers/StoreHelper';
import { sendMessage } from 'client-shared/helpers/NodecgHelper';

const obsStore = useObsStore();
const errorHandlerStore = useErrorHandlerStore();

const socketUrl = ref('');
const socketPassword = ref('');
updateRefOnValueChange(() => obsStore.obsConnectionInfo.address, socketUrl);
updateRefOnValueChange(() => obsStore.obsConnectionInfo.password, socketPassword);

const socketEnabled = computed({
    get() {
        return obsStore.obsState.enabled;
    },
    async set(value: boolean): Promise<void> {
        try {
            await sendMessage('obs:setEnabled', { enabled: value });
        } catch (err) {
            errorHandlerStore.handleError({ err });
        }
    }
});

const statusText = computed(() => {
    switch (obsStore.obsState.status) {
        case 'CONNECTED':
            return 'Connected';
        case 'CONNECTING':
            return 'Connecting...'
        case 'NOT_CONNECTED':
            return 'Not connected'
    }
});

const isChanged = computed(() =>
    socketUrl.value !== obsStore.obsConnectionInfo.address
    || socketPassword.value !== obsStore.obsConnectionInfo.password);

const { allValid } = provideValidators({
    socketUrl: validator(true, notBlank)
});

async function connect() {
    await sendMessage('obs:connect', { address: socketUrl.value, password: socketPassword.value });
}
</script>

<style lang="scss" scoped>
@use '../../styles/dashboard-colors';

.status-display {
    border-radius: 5px !important;
    font-weight: 600;
}

.obs-status_CONNECTING {
    background-color: dashboard-colors.$state-yellow !important;
    color: #222;
}

.obs-status_NOT_CONNECTED {
    background-color: dashboard-colors.$state-red !important;
}

.obs-status_CONNECTED {
    background-color: dashboard-colors.$state-green !important;
}
</style>
