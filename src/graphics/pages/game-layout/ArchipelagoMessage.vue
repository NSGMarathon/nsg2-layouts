<template>
    <div
        v-if="archipelagoStore.archipelagoConfig.enabled"
        class="archipelago-message layout horizontal center-vertical center-horizontal"
    >
        <div
            v-if="archipelagoStore.countdown != null"
            class="countdown"
        >
            {{ archipelagoStore.countdown === 0 ? 'GO!' : archipelagoStore.countdown }}
        </div>
        <opacity-swap-transition v-else>
            <div
                v-if="message != null"
                :key="message?.ordinal"
                class="message"
                :style="{ '-webkit-line-clamp': props.maxLineCount }"
            >
                <template v-if="message.type === 'itemsSent'">
                    <template v-if="message.receiverName === message.senderName">
                        <template v-if="message.items.length === 1">
                            <span class="player-name">{{ message.receiverName }}</span> found their <span class="item-name">{{ message.items[0].name }}</span> (<span class="location">{{ message.items[0].location }}</span>)
                        </template>
                        <template v-else-if="message.items.length < 4">
                            <span class="player-name">{{ message.receiverName }}</span> found their <span class="item-name">{{ addDots(prettyPrintList(message.items.map((item) => item.name)), 64) }}</span>
                        </template>
                        <template v-else>
                            <span class="player-name">{{ message.receiverName }}</span> found <span class="item-name">{{ message.items.length }} of their items</span>
                        </template>
                    </template>
                    <template v-else>
                        <template v-if="message.items.length === 1">
                            <span class="player-name">{{ message.senderName }}</span> sent <span class="item-name">{{ message.items[0].name }}</span> to <span class="player-name">{{ message.receiverName }}</span> (<span class="location">{{ message.items[0].location }}</span>)
                        </template>
                        <template v-else-if="message.items.length < 4">
                            <span class="player-name">{{ message.senderName }}</span> sent <span class="item-name">{{ addDots(prettyPrintList(message.items.map((item) => item.name)), 64) }}</span> to <span class="player-name">{{ message.receiverName }}</span>
                        </template>
                        <template v-else>
                            <span class="player-name">{{ message.senderName }}</span> sent <span class="item-name">{{ message.items.length }} items</span> to <span class="player-name">{{ message.receiverName }}</span>
                        </template>
                    </template>
                </template>
                <template v-else-if="message.type === 'goaled'">
                    <span class="player-name">{{ message.playerName }}</span> has completed their goal!
                </template>
                <template v-else-if="message.type === 'itemHinted'">
                    <span class="player-name">{{ message.receiverName }}</span>{{ possessive(message.receiverName) }} <span class="item-name">{{ message.itemName }}</span> is at <span class="location">{{ message.locationName }}</span> in <span class="player-name">{{ message.senderName }}</span>{{ possessive(message.senderName) }} world
                </template>
                <template v-else-if="message.type === 'itemCheated'">
                    Gave <span class="item-name">{{ message.itemName }}</span> to <span class="player-name">{{ message.receiverName }}</span>
                </template>
            </div>
        </opacity-swap-transition>
    </div>
</template>

<script setup lang="ts">
import { useArchipelagoStore } from 'client-shared/stores/ArchipelagoStore';
import OpacitySwapTransition from 'components/OpacitySwapTransition.vue';
import { computed } from 'vue';
import { possessive, prettyPrintList } from 'shared/StringHelper';
import { addDots } from 'client-shared/helpers/StringHelper';

const props = defineProps<{
    maxLineCount: number
}>();

const archipelagoStore = useArchipelagoStore();

const message = computed(() => archipelagoStore.messageQueue[0]);
</script>

<style scoped lang="scss">
@use '../../styles/colors';

.archipelago-message {
    background-color: colors.$vfd-background;
    overflow: hidden;
}

.countdown {
    text-align: center;
    color: colors.$vfd-teal;
    font-size: 48px;
    font-weight: 600;
}

.message {
    font-size: 24px;
    color: #fff;
    text-align: center;
    overflow-wrap: anywhere;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.player-name, .item-name, .location {
    color: colors.$vfd-teal;
    font-weight: 500;
}
</style>
