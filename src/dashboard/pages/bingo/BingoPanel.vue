<template>
    <error-display class="m-b-8" />
    <ipl-space>
        <ipl-input
            v-model="roomSlug"
            name="roomSlug"
            label="Room slug"
        />
        <ipl-input
            v-model="roomPassword"
            type="password"
            name="roomPassword"
            label="Password"
        />
        <ipl-button
            class="m-t-8"
            label="Update"
            @click="onUpdate"
        />
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
    </ipl-space>
    <bingo-talent-mapping-configurer
        v-if="bingoStore.bingoConfig.enabled"
        class="m-t-8"
    />
</template>

<script setup lang="ts">
import { IplButton, IplInput, IplSpace, IplToggle } from '@iplsplatoon/vue-components';
import { useBingoStore } from 'client-shared/stores/BingoStore';
import { computed, ref } from 'vue';
import { updateRefOnValueChange } from 'client-shared/helpers/StoreHelper';
import ErrorDisplay from '../../components/ErrorDisplay.vue';
import BingoTalentMappingConfigurer from './BingoTalentMappingConfigurer.vue';

const bingoStore = useBingoStore();

const enabled = computed({
    get() {
        return bingoStore.bingoConfig.enabled;
    },
    set(newValue: boolean) {
        bingoStore.setBingoEnabled(newValue);
    }
});

const roomSlug = ref('');
const roomPassword = ref('');
updateRefOnValueChange(() => bingoStore.bingoConfig.roomSlug, roomSlug);
updateRefOnValueChange(() => bingoStore.bingoConfig.roomPassword, roomPassword);

function onUpdate() {
    bingoStore.setBingoConfig(roomSlug.value, roomPassword.value);
}

const stateDisplay = computed(() => {
    switch (bingoStore.bingoState.connectionState) {
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

<style lang="scss" scoped>
.state-display {
    border-radius: 5px;
    text-align: center;
    padding: 8px;
    font-weight: 600;
}
</style>
