<template>
    <ipl-dialog
        v-model:is-open="isOpen"
        style="width: 400px"
        anchor-y="start"
    >
        <template #header>
            <ipl-input
                v-model="query"
                name="categoryName"
                :loading="searchLoading"
                theme="large"
                placeholder="Search for a game or category..."
                type="search"
                class="max-width"
                ref="queryInput"
            />
            <div class="layout vertical center-horizontal m-t-8 m-b-4">
                <ipl-radio
                    v-model="dataSource"
                    :options="dataSourceOptions"
                    label="Search from..."
                    name="dataSource"
                />
            </div>
        </template>
        <ipl-message
            v-if="!twitchIntegrationEnabled"
            type="warning"
        >
            Not logged in to Twitch
        </ipl-message>
        <template v-else>
            <div class="results-display">
                <ipl-space
                    v-for="result in searchResults"
                    :key="result.category.id"
                    color="secondary"
                    class="result-item"
                    clickable
                    @click="onSelect(result)"
                >
                    <img
                        v-if="result.category.boxArtUrl != null"
                        loading="lazy"
                        :src="result.category.boxArtUrl"
                    >
                    <div v-else />
                    <div>
                        {{ result.category.name }}
                        <span
                            v-if="result.releaseYear != null"
                            class="release-year text-low-emphasis"
                        >
                            ({{ result.releaseYear }})
                        </span>
                        <div>
                            <a
                                v-if="result.twitchCategoryUrl != null"
                                :href="result.twitchCategoryUrl"
                                target="_blank"
                                @click.stop
                            >
                                Twitch
                            </a>
                            <a
                                v-if="result.igdbUrl != null"
                                :href="result.igdbUrl"
                                target="_blank"
                                @click.stop
                            >
                                IGDB
                            </a>
                        </div>
                    </div>
                </ipl-space>
            </div>
        </template>
    </ipl-dialog>
</template>

<script setup lang="ts">
import { IplDialog, IplInput, IplMessage, IplRadio, IplSpace } from '@iplsplatoon/vue-components';
import { computed, nextTick, ref, watch } from 'vue';
import { isBlank } from 'shared/StringHelper';
import debounce from 'lodash/debounce';
import { sendMessage } from 'client-shared/helpers/NodecgHelper';
import { useTwitchDataStore } from 'client-shared/stores/TwitchDataStore';

type SelectCallbackData = { category: { id: string, name: string, boxArtUrl?: string }, releaseYear?: string, twitchCategoryUrl?: string, igdbUrl?: string };

const twitchDataStore = useTwitchDataStore();

const props = defineProps<{
    scheduleItemTitle: string
}>();

const dataSource = ref('igdb');
const dataSourceOptions = [
    { value: 'igdb', name: 'IGDB (Games)' },
    { value: 'twitch', name: 'Twitch (Anything else)' }
]

const isOpen = ref(false);
const query = ref('');
const queryInput = ref<InstanceType<typeof IplInput>>();
let selectCallback: ((game: SelectCallbackData) => void) | null = null;

const twitchIntegrationEnabled = computed(() => twitchDataStore.twitchData.state !== 'NOT_LOGGED_IN');

const searchResults = ref<SelectCallbackData[]>([]);
const searchLoading = ref(false);
async function onQueryChange(newQuery: string, dataSource: string) {
    if (isBlank(newQuery)) {
        searchResults.value = [];
        searchLoading.value = false;
        return;
    }

    searchLoading.value = true;
    try {
        if (dataSource === 'twitch') {
            const newSearchResults = await sendMessage('twitch:findCategory', { name: newQuery });
            if (newSearchResults == null) {
                searchResults.value = [];
            } else {
                searchResults.value = newSearchResults.map(result => ({ category: result }));
            }
        } else {
            const newSearchResults = await sendMessage('igdb:findGame', { name: newQuery });
            if (newSearchResults == null) {
                searchResults.value = [];
            } else {
                searchResults.value = newSearchResults.map(result => ({
                    category: {
                        id: result.twitchGameId,
                        name: result.twitchGameName || result.name,
                        boxArtUrl: result.boxArtUrl
                    },
                    releaseYear: result.releaseYear,
                    twitchCategoryUrl: result.twitchCategoryUrl,
                    igdbUrl: result.url
                }));
            }
        }
    } catch (e) {
        console.error('Error searching for Twitch category', e);
        searchResults.value = [];
    } finally {
        searchLoading.value = false;
    }
}
const debouncedOnQueryChange = debounce(onQueryChange, 500);
watch([query, dataSource], newValue => debouncedOnQueryChange(newValue[0], newValue[1]));

watch(isOpen, newValue => {
    if (!newValue) {
        selectCallback = null;
        query.value = '';
        dataSource.value = 'igdb';
    }
});

function open(onSelect: (game: SelectCallbackData) => void) {
    query.value = props.scheduleItemTitle;
    selectCallback = onSelect;
    isOpen.value = true;
    nextTick(() => {
        queryInput.value?.focus();
        queryInput.value?.select();
    });
}

function onSelect(data: SelectCallbackData) {
    if (selectCallback) {
        selectCallback(data);
    }
    isOpen.value = false;
}

defineExpose({
    open
});
</script>

<style scoped lang="scss">
.results-display {
    min-height: 61px;

    > * {
        display: grid !important;
        grid-template-columns: 50px 1fr;
        align-items: center;

        img {
            height: 45px;
        }

        &:not(:last-child) {
            margin-bottom: 8px;
        }
    }
}
</style>
