<template>
    <div>
        <ipl-input
            v-model="props.modelValue.name"
            name="name"
            label="Name"
            ref="nameInput"
        />
        <div class="layout horizontal m-t-4">
            <ipl-input
                v-model="props.modelValue.pronouns"
                name="pronouns"
                label="Pronouns"
                class="max-width"
            />
            <country-code-select
                v-model="props.modelValue.countryCode"
                color="primary"
                class="max-width m-l-8"
            />
            <ipl-input
                v-model="props.modelValue.socials.twitch"
                name="twitch"
                label="Twitch"
                class="max-width m-l-8"
            />
        </div>
        <div class="layout horizontal m-t-4">
            <ipl-input
                v-model="props.modelValue.socials.youtube"
                name="youtube"
                label="YouTube"
                class="max-width"
            />
            <ipl-input
                v-model="props.modelValue.socials.twitter"
                name="twitter"
                label="Twitter"
                class="max-width m-l-8"
            />
            <ipl-input
                v-model="props.modelValue.socials.speedruncom"
                name="speedruncom"
                label="Speedrun.com"
                class="max-width m-l-8"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { IplInput } from '@iplsplatoon/vue-components';
import { Talent } from 'types/schemas';
import CountryCodeSelect from './CountryCodeSelect.vue';
import { ref } from 'vue';

const props = defineProps<{
    modelValue: Talent[number]
}>();

const nameInput = ref<InstanceType<typeof IplInput>>();

function focus() {
    nameInput.value?.focus();
}

defineExpose({
    focus
});
</script>
