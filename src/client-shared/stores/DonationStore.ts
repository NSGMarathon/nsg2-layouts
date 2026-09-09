import { DonationTotal } from 'types/schemas';
import { defineStore } from 'pinia';
import { createReplicantStoreInitializer } from 'client-shared/helpers/StoreHelper';
import { CurrencyConversionRate } from 'types/schemas/currencyConversionRate';

const donationTotal = nodecg.Replicant<DonationTotal>('donationTotal');
const currencyConversionRate = nodecg.Replicant<CurrencyConversionRate>('currencyConversionRate');

interface DonationStore {
    donationTotal: DonationTotal
    currencyConversionRate: CurrencyConversionRate
}

export const useDonationStore = defineStore('donation', {
    state: () => ({
        donationTotal: 0,
        currencyConversionRate: null
    } as unknown as DonationStore),
    getters: {
        convertedTotal: (state) => state.currencyConversionRate == null
            ? null
            : Math.floor(Math.floor(state.donationTotal) * state.currencyConversionRate.rate)
    }
});

export const initDonationStore = createReplicantStoreInitializer([donationTotal, currencyConversionRate], useDonationStore);
