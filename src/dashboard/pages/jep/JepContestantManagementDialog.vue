<template>
    <form @submit.prevent>
        <ipl-dialog
            v-model:is-open="isOpen"
            style="width: 700px"
            @update:is-open="onOpenChange"
        >
            <template #header>
                <ipl-dialog-title title="Manage contestants" @close="isOpen = false">
                    <template #end>
                        <ipl-button
                            v-slot="{ state }"
                            color="red"
                            requires-confirmation
                            small
                            style="white-space: nowrap"
                            @click="reset(false)"
                        >
                            <font-awesome-icon icon="rotate-left" />
                            {{ state === 'confirm' ? 'Confirm?' : 'Reset' }}
                        </ipl-button>
                        <ipl-button
                            v-slot="{ state }"
                            color="red"
                            requires-confirmation
                            small
                            style="white-space: nowrap"
                            @click="reset(true)"
                        >
                            <font-awesome-icon icon="rotate-left" />
                            {{ state === 'confirm' ? 'Confirm?' : 'Reset (Test)' }}
                        </ipl-button>
                    </template>
                </ipl-dialog-title>
            </template>
            <div class="dialog-layout">
                <ipl-space
                    v-for="(c, i) of contestants"
                    color="secondary"
                >
                    <div class="title">Contestant {{ i + 1 }}</div>
                    <ipl-input
                        v-model="c.name"
                        :name="`name_${i}`"
                        label="Name"
                    />
                    <ipl-select
                        v-model="c.signatureUrl"
                        :name="`signature_${i}`"
                        :options="signatureOptions"
                        label="Signature"
                        class="m-t-4"
                    />
                    <ipl-select
                        v-model="c.symbolUrl"
                        :name="`symbol_${i}`"
                        :options="symbolOptions"
                        label="Symbol"
                        class="m-t-4"
                    />
                    <ipl-checkbox
                        v-model="c.updateScore"
                        label="Update score"
                        :disabled="isInitializingGame"
                        class="m-t-4"
                    />
                    <ipl-input
                        v-model="c.score"
                        :name="`score_${i}`"
                        label="Score"
                        type="number"
                        :disabled="isInitializingGame || !c.updateScore"
                        class="m-t-4"
                    />
                </ipl-space>
            </div>
            <template #footer>
                <div style="max-width: 200px; margin: 0 auto">
                    <ipl-button
                        type="submit"
                        :disabled="!canSave"
                        label="Save"
                        color="green"
                        @click="save"
                    />
                </div>
            </template>
        </ipl-dialog>
    </form>
</template>

<script setup lang="ts">
import {
    IplButton,
    IplCheckbox,
    IplDialog,
    IplDialogTitle,
    IplInput,
    IplSelect,
    IplSpace
} from '@iplsplatoon/vue-components';
import { computed, ref } from 'vue';
import { sendMessage } from 'client-shared/helpers/NodecgHelper';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faRotateLeft } from '@fortawesome/free-solid-svg-icons/faRotateLeft';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { useJepStore } from 'client-shared/stores/JepStore';
import { JEP_CONTESTANT_COUNT } from 'shared/JepConstants';
import cloneDeep from 'lodash/cloneDeep';
import { isBlank } from 'shared/StringHelper';
import { JepContestants } from 'types/schemas/jepContestants';

library.add(faRotateLeft);

const jepStore = useJepStore();
const isOpen = ref(false);
const contestants = ref<(JepContestants[number] & { updateScore: boolean })[]>([]);
const updateScore = ref(false);

const signatureOptions = computed(() => jepStore['assets:jepContestantSignatures'].map((sig) => ({
    name: sig.name,
    value: sig.url
})));

const symbolOptions = computed(() => jepStore['assets:jepContestantSymbols'].map((sym) => ({
    name: sym.name,
    value: sym.url
})));

const isInitializingGame = computed(() => jepStore.jepState.state === 'WAITING_FOR_CONTESTANT_INFO');
const canSave = computed(() => contestants.value.every((p) =>
    !isBlank(p.name) &&
    !isBlank(p.symbolUrl) &&
    !isBlank(p.signatureUrl) &&
    typeof p.score === 'number'));

async function reset(useTestBoard: boolean) {
    await sendMessage('jep:reset', { useTestBoard });
}

function open() {
    contestants.value = Array.from({ length: JEP_CONTESTANT_COUNT }, (_, i) => {
        const existingContestant = cloneDeep(jepStore.jepContestants[i]);
        if (existingContestant == null) {
            return {
                name: '',
                signatureUrl: '',
                symbolUrl: '',
                updateScore: false,
                score: 0
            };
        } else {
            return {
                ...existingContestant,
                updateScore: false
            };
        }
    });

    isOpen.value = true;
}

async function save() {
    await sendMessage('jep:setContestantInfo', contestants.value.map((p) => ({
        name: p.name,
        signatureUrl: p.signatureUrl,
        symbolUrl: p.symbolUrl,
        score: p.updateScore ? p.score : null
    })));
    isOpen.value = false;
}

function onOpenChange(isOpen: boolean) {
    if (!isOpen) {
        updateScore.value = false;
    }
}

defineExpose({
    open
});
</script>

<style scoped lang="scss">
.dialog-layout {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, 1fr);
    gap: 8px;
}
</style>
