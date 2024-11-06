<template>
    <ipl-space>
        <div class="title">Oengus login (Optional)</div>
        <ipl-input
            v-model="username"
            label="Username"
            name="username"
        />
        <ipl-input
            v-model="password"
            type="password"
            label="Password"
            name="password"
        />
        <ipl-input
            v-model="twoFactorCode"
            label="2FA code (Optional)"
            name="twoFactorCode"
        />
        <ipl-button
            class="m-t-8"
            label="Login"
            color="green"
            async
            :disabled="!loginAllowed"
            @click="login"
        />
        <ipl-space
            class="text-center m-t-8 status-display"
            :class="{ 'logged-in': oengusDataStore.oengusData.token != null }"
        >
            {{ oengusDataStore.oengusData.token != null ? 'Logged in' : 'Not logged in' }}
        </ipl-space>
    </ipl-space>
</template>

<script setup lang="ts">
import { IplButton, IplInput, IplSpace } from '@iplsplatoon/vue-components';
import { computed, ref } from 'vue';
import { sendMessage } from 'client-shared/helpers/NodecgHelper';
import { isBlank } from 'shared/StringHelper';
import { useOengusDataStore } from 'client-shared/stores/OengusDataStore';

const oengusDataStore = useOengusDataStore();

const username = ref('');
const password = ref('');
const twoFactorCode = ref('');

const loginAllowed = computed(() => !isBlank(username.value) && !isBlank(password.value));

async function login() {
    await sendMessage('oengus:login', {
        username: username.value,
        password: password.value,
        twoFactorCode: isBlank(twoFactorCode.value) ? undefined : twoFactorCode.value
    });
    username.value = '';
    password.value = '';
    twoFactorCode.value = '';
}
</script>

<style scoped lang="scss">
@use '../../styles/dashboard-colors';

.status-display {
    border-radius: 5px !important;
    font-weight: 600;
    background-color: dashboard-colors.$state-red !important;

    &.logged-in {
        background-color: dashboard-colors.$state-green !important;
    }
}
</style>
