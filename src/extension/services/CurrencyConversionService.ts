import { HasNodecgLogger } from '../helpers/HasNodecgLogger';
import type NodeCG from '@nodecg/types';
import { Configschema } from 'types/schemas';
import { EcbClient } from '../clients/EcbClient';
import { CurrencyConversionRate } from 'types/schemas/currencyConversionRate';
import { DateTime } from 'luxon';

// The exchange rate between NOK and EUR is exactly variable enough to warrant doing all this crap to figure out what it
// actually is. If we were running on something like the Danish Krone, I could probably have hardcoded the exchange rate
// and nobody would have noticed, ha.

export class CurrencyConversionService extends HasNodecgLogger {
    private readonly ecbClient: EcbClient | null;
    private readonly currencyConversionRate?: NodeCG.ServerReplicantWithSchemaDefault<CurrencyConversionRate>;

    constructor(nodecg: NodeCG.ServerAPI<Configschema>) {
        super(nodecg);

        const config = nodecg.bundleConfig.currencyConversion;
        const ecbConfig = config?.ecb;
        if (config != null && config.enabled) {
            this.ecbClient = new EcbClient({
                invertConversion: ecbConfig?.invertConversion ?? true,
                seriesKey: ecbConfig?.seriesKey ?? 'D.NOK.EUR.SP00.A'
            });

            this.currencyConversionRate = nodecg.Replicant('currencyConversionRate') as unknown as NodeCG.ServerReplicantWithSchemaDefault<CurrencyConversionRate>;
            if (this.currencyConversionRate.value != null && this.currencyConversionRate.value.seriesKey !== this.ecbClient.requestConfig.seriesKey) {
                this.currencyConversionRate.value = null;
            }

            this.scheduleNextRateCheck(true);
        } else {
            if (config != null && !config.enabled) {
                this.logger.info('Currency conversion has been disabled');
            } else {
                this.logger.info('Currency conversion config is missing one or more required values');
            }

            this.ecbClient = null;
        }
    }

    private scheduleNextRateCheck(isFirstCheck = false, mustDelay = false) {
        if (this.ecbClient == null || this.currencyConversionRate == null) return;

        if (this.currencyConversionRate.value == null) {
            if (mustDelay) {
                setTimeout(this.getConversionRate.bind(this), 20 * 60 * 1000);
            } else {
                this.getConversionRate();
            }
        } else {
            const estimatedRefreshTime = DateTime.fromISO(this.currencyConversionRate.value.estimatedRefreshTime);
            const now = DateTime.now();

            if (estimatedRefreshTime > now) {
                const checkRateInMillis = estimatedRefreshTime.diff(now, 'milliseconds').milliseconds;
                this.logger.debug(`Next exchange rate check scheduled for ${estimatedRefreshTime.toISO()}`);
                setTimeout(this.getConversionRate.bind(this), checkRateInMillis);
            } else {
                if (isFirstCheck) {
                    this.getConversionRate();
                } else {
                    this.logger.debug('Next exchange rate check scheduled for an hour from now');
                    setTimeout(this.getConversionRate.bind(this), 60 * 60 * 1000);
                }
            }
        }
    }

    async getConversionRate() {
        if (this.ecbClient == null) {
            this.logger.warn('Currency conversion rate requested while currency conversion was disabled');
        } else {
            try {
                this.logger.debug('Requesting exchange rates');
                const result = await this.ecbClient.getExchangeRate();
                this.logger.debug(`New currency conversion rate is ${result.observedValue}`);
                this.currencyConversionRate!.value = {
                    rate: result.observedValue,
                    validUntil: result.observationPeriodEnd.toISO(),
                    estimatedRefreshTime: result.estimatedRefreshTime.toISO(),
                    seriesKey: this.ecbClient.requestConfig.seriesKey
                };
                this.scheduleNextRateCheck();
            } catch (e) {
                this.logError('Error retrieving currency conversion rates', e);
                // We hope this is a temporary error. Nevertheless, we choose to delay the next request.
                this.scheduleNextRateCheck(false, true);
            }
        }
    }
}
