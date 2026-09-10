<template>
    <div class="media-box">
        <opacity-swap-transition mode="default">
            <img
                :key="slides.activeComponent.value ?? ''"
                :src="slides.activeComponent.value ?? ''"
            >
        </opacity-swap-transition>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import OpacitySwapTransition from './OpacitySwapTransition.vue';
import { loadAndCheckIfImageExists } from '../helpers/ImageHelper';
import { useSlides } from '../helpers/useSlides';
import { useAssetStore } from 'client-shared/stores/AssetStore';

const assetStore = useAssetStore();
const slides = useSlides(computed(() => assetStore.allMediaBoxImages
    .map((image) => ({
        component: image.url,
        duration: 15,
        beforeChange: async (image) => {
            await loadAndCheckIfImageExists(image);
        }
    }))));

onMounted(async () => {
    await Promise.all(assetStore['assets:mediaBoxImages'].map(image => loadAndCheckIfImageExists(image.url)));
});
</script>

<style scoped lang="scss">
.media-box {
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;

    > img {
        position: absolute;
        max-height: 100%;
        max-width: 100%;
        image-rendering: -webkit-optimize-contrast;
    }
}
</style>
