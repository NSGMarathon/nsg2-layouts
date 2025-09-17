<template>
    <div
        class="standalone-bingo"
        :style="{ fontSize: `${normalizedScaleParam}em` }"
    >
        <bingo-board
            class="max-height"
            standalone
        />
    </div>
</template>

<script setup lang="ts">
import BingoBoard from 'components/BingoBoard.vue';

const params = new URLSearchParams(window.location.search);
const scaleParam = Number(params.get('scale') ?? '1');
const normalizedScaleParam = scaleParam != null && !Number.isNaN(scaleParam) ? scaleParam : 1;
</script>

<style scoped lang="scss">
.standalone-bingo {
    position: absolute;
    top: 0;
    left: 0;
    width: 100dvw;
    height: 100dvh;
    overflow: hidden;
}
</style>
