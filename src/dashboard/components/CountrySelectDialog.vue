<template>
    <ipl-dialog
        v-model:is-open="isOpen"
        style="width: 400px"
        :style="floatingStyles"
        ref="dialog"
    >
        <template #header>
            <ipl-space color="secondary">
                <ipl-input
                    v-model="query"
                    name="country"
                    theme="large"
                    placeholder="Search for a country or region..."
                    type="search"
                    ref="queryInput"
                />
            </ipl-space>
        </template>
        <div class="results-display">
            <ipl-space
                v-for="[code, name] in searchResults"
                :key="code"
                clickable
                color="secondary"
                class="result-item"
                @click="onSelect(code)"
            >
                <!-- try not to load all 400-something flags at once -->
                <!-- note: be careful with attribute order here: https://bugzilla.mozilla.org/show_bug.cgi?id=1647077 -->
                <!-- incredible bug! -->
                <img
                    loading="lazy"
                    :src="`/bundles/${bundleName}/flags/svg/${code}.svg`"
                    :alt="code"
                >
                <span>{{ name }}<span class="text-low-emphasis m-l-4">{{ code }}</span></span>
            </ipl-space>
            <div
                v-if="searchResults.length === 0"
                class="text-low-emphasis text-center"
                style="padding: 8px 0"
            >
                No results found
            </div>
        </div>
    </ipl-dialog>
</template>

<script setup lang="ts">
import { IplDialog, IplInput, IplSpace } from '@iplsplatoon/vue-components';
import { computed, nextTick, ref, watch } from 'vue';
import regions from '../../../flags/regions.json';
import { isBlank } from 'shared/StringHelper';
import { offset, shift, size, useFloating } from '@floating-ui/vue';

const isOpen = ref(false);
const query = ref('');
const bundleName = nodecg.bundleName;
const queryInput = ref<InstanceType<typeof IplInput>>();
const dialog = ref<InstanceType<typeof IplDialog>>();
const floatingTarget = ref<HTMLElement | null>(null);
let selectCallback: ((countryCode: string) => void) | null = null;

const { floatingStyles } = useFloating(floatingTarget, dialog, {
    placement: 'right',
    middleware: [
        offset(8),
        shift({
            crossAxis: true,
            mainAxis: true,
            padding: 8
        }),
        size({
            padding: 8,
            apply(args: any) {
                args.elements.floating.style.maxHeight = args.availableHeight - args.y + 'px';
            }
        })
    ]
});

watch(isOpen, newValue => {
    if (!newValue) {
        selectCallback = null;
        query.value = '';
    }
});

function open(onSelect: (countryCode: string) => void, target: HTMLElement) {
    floatingTarget.value = target;
    selectCallback = onSelect;
    isOpen.value = true;
    nextTick(() => {
        queryInput.value?.focus();
    });
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
    > .result-item {
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
