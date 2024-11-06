<template>
    <ipl-dialog
        v-model:is-open="isOpen"
        style="width: 400px"
    >
        <ipl-space color="secondary">
            <ipl-input
                v-model="query"
                name="country"
                theme="large"
                placeholder="Search for a country or region..."
                type="search"
            />
        </ipl-space>
        <ipl-space
            color="secondary"
            class="m-t-8 results-display"
        >
            <ipl-space
                v-for="[code, name] in searchResults"
                :key="code"
                clickable
                @click="onSelect(code)"
            >
                <!-- try not to load all 400-something flags at once -->
                <!-- note: be careful with attribute order here: https://bugzilla.mozilla.org/show_bug.cgi?id=1647077 -->
                <!-- incredible bug! -->
                <img
                    v-if="isOpen"
                    loading="lazy"
                    :src="`/bundles/${bundleName}/flags/svg/${code}.svg`"
                    :alt="code"
                >
                <span>{{ name }}<span class="text-low-emphasis m-l-4">{{ code }}</span></span>
            </ipl-space>
        </ipl-space>
    </ipl-dialog>
</template>

<script setup lang="ts">
import { IplDialog, IplInput, IplSpace } from '@iplsplatoon/vue-components';
import { computed, ref, watch } from 'vue';
import regions from '../../../flags/regions.json';
import { isBlank } from 'shared/StringHelper';

const isOpen = ref(false);
const query = ref('');
const bundleName = nodecg.bundleName;
let selectCallback: ((countryCode: string) => void) | null = null;

watch(isOpen, newValue => {
    if (!newValue) {
        selectCallback = null;
        query.value = '';
    }
});

function open(onSelect: (countryCode: string) => void) {
    selectCallback = onSelect;
    isOpen.value = true;
}

function onSelect(countryCode: string) {
    if (selectCallback) {
        selectCallback(countryCode);
    }
    isOpen.value = false;
}

const searchResults = computed(() => {
    if (isBlank(query.value)) {
        return Object.entries(regions);
    }

    return Object.entries(regions).filter(([code, name]) => code.includes(query.value.toUpperCase()) || name.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().includes(query.value.toLowerCase()));
});

defineExpose({
    open
});
</script>

<style scoped lang="scss">
.results-display {
    height: 75vh;
    overflow-y: auto;

    > * {
        display: grid !important;
        grid-template-columns: 50px 1fr;
        align-items: center;

        img {
            height: 15px;
            border: 1px solid var(--ipl-input-color);
        }

        &:not(:last-child) {
            margin-bottom: 8px;
        }
    }
}
</style>
