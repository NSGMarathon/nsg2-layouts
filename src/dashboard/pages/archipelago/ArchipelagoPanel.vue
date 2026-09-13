<template>
    <ipl-space>
        <form @submit.prevent>
            <ipl-input
                v-model="serverAddress"
                name="serverAddress"
                label="Server address"
            />
            <ipl-input
                v-model="slotName"
                name="slotName"
                label="Slot name"
            />
            <ipl-input
                v-model="password"
                name="password"
                type="password"
                label="Password (optional)"
            />
            <ipl-button
                class="m-t-8"
                label="Update"
                type="submit"
                @click="onUpdate"
            />
        </form>
        <ipl-toggle
            v-model="enabled"
            class="m-t-8"
            true-label="enable"
            false-label="disable"
        />
        <div
            class="state-display m-t-8"
            :class="stateDisplay.color"
        >
            {{ stateDisplay.text }}
        </div>
        <small class="m-t-8 text-center" style="display: block">Archipelago support is only available on select layouts.</small>
    </ipl-space>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useArchipelagoStore } from 'client-shared/stores/ArchipelagoStore';
import { IplButton, IplInput, IplSpace, IplToggle } from '@iplsplatoon/vue-components';
import { updateRefOnValueChange } from 'client-shared/helpers/StoreHelper';

const archipelagoStore = useArchipelagoStore();

const enabled = computed({
    get() {
        return archipelagoStore.archipelagoConfig.enabled;
    },
    set(newValue: boolean) {
        archipelagoStore.setEnabled(newValue);
    }
});

const serverAddress = ref('');
const slotName = ref('');
const password = ref('');
updateRefOnValueChange(() => archipelagoStore.archipelagoConfig.serverAddress, serverAddress);
updateRefOnValueChange(() => archipelagoStore.archipelagoConfig.slotName, slotName);
updateRefOnValueChange(() => archipelagoStore.archipelagoConfig.password ?? '', password);

function onUpdate() {
    archipelagoStore.setConfig(serverAddress.value, slotName.value, password.value);
}

const stateDisplay = computed(() => {
    switch (archipelagoStore.archipelagoState.connectionState) {
        case 'CONNECTED':
            return { text: 'Connected!', color: 'state-background-green' };
        case 'CONNECTING':
            return { text: 'Connecting...', color: 'state-background-yellow' };
        case 'ERROR':
            return { text: 'Error!', color: 'state-background-red' };
        case 'NOT_CONNECTED':
            return { text: 'Not connected', color: 'state-background-red' };
    }
});
</script>

<style scoped lang="scss">
.state-display {
    border-radius: 5px;
    text-align: center;
    padding: 8px;
    font-weight: 600;
}
</style>
