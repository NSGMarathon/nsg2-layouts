<template>
    <div class="host-layout">
        <div>
            <current-host-manager />
            <scene-switcher class="m-t-8" />
            <twitch-commercial-player class="m-t-8" />
        </div>
        <div style="overflow-y: auto">
            <bid-list />
            <prize-list class="m-t-8" />
                <milestone-list class="m-t-8" />
        </div>
        <div>
            <ipl-space class="text-center donation-total">
                {{ formatCurrencyAmount(donationStore.donationTotal, true) }}
            </ipl-space>
            <host-active-run-display class="m-t-8" />
        </div>
        <rundown-display readonly />
    </div>
    <country-select-dialog ref="countrySelectDialog" />
    <talent-item-edit-dialog ref="talentItemEditDialog" />
    <interstitial-video-player-dialog ref="interstitialVideoPlayerDialog" />
</template>

<script setup lang="ts">
import RundownDisplay from '../../components/RundownDisplay.vue';
import CurrentHostManager from './CurrentHostManager.vue';
import CountrySelectDialog from '../../components/CountrySelectDialog.vue';
import { provide, ref } from 'vue';
import {
    CountrySelectDialogInjectionKey,
    InterstitialVideoPlayerDialogInjectionKey,
    TalentItemEditDialogInjectionKey
} from '../../helpers/Injections';
import TalentItemEditDialog from '../../components/TalentItemEditDialog.vue';
import SceneSwitcher from '../../components/SceneSwitcher.vue';
import BidList from './BidList.vue';
import MilestoneList from './MilestoneList.vue';
import { IplSpace } from '@iplsplatoon/vue-components';
import { useDonationStore } from 'client-shared/stores/DonationStore';
import PrizeList from './PrizeList.vue';
import { formatCurrencyAmount } from 'client-shared/helpers/StringHelper';
import HostActiveRunDisplay from './HostActiveRunDisplay.vue';
import TwitchCommercialPlayer from '../../components/TwitchCommercialPlayer.vue';
import InterstitialVideoPlayerDialog from '../../components/InterstitialVideoPlayerDialog.vue';

const donationStore = useDonationStore();

const countrySelectDialog = ref<InstanceType<typeof CountrySelectDialog>>();
provide(CountrySelectDialogInjectionKey, countrySelectDialog);
const talentItemEditDialog = ref<InstanceType<typeof TalentItemEditDialog>>();
provide(TalentItemEditDialogInjectionKey, talentItemEditDialog);
const interstitialVideoPlayerDialog = ref<InstanceType<typeof InterstitialVideoPlayerDialog>>();
provide(InterstitialVideoPlayerDialogInjectionKey, interstitialVideoPlayerDialog);
</script>

<style lang="scss">
body {
    margin: 0 !important;
    overflow-y: hidden;
}
</style>

<style scoped lang="scss">
.host-layout {
    display: grid;
    height: 100vh;
    padding: 8px;
    grid-template-columns: 0.75fr 1fr 1fr 1fr;
    gap: 8px;
    box-sizing: border-box;
    min-width: 1500px;
    overflow-x: auto;
}

.donation-total {
    font-weight: 700;
    font-size: 1.75em;
}
</style>
