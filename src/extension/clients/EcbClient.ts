import { Configschema } from 'types/schemas';
import { AxiosInstance, AxiosResponse, isAxiosError } from 'axios';
import axios from 'axios';
import { DateTime } from 'luxon';

type ClientConfig = Required<NonNullable<NonNullable<Configschema['currencyConversion']>['ecb']>>;

type SdmxComponent = {
    id?: string
    name: string
    role?: string
    values: {
        id?: string
        name: string
        start?: string
        end?: string
    }[]
};

// Abridged SDMX-JSON data message, version 1.0.0-cts
type SdmxResponse = {
    header: {
        id: string
        prepared: string
        sender: { id: string }
    }
    dataSets?: {
        action?: 'Information' | 'Append' | 'Replace' | 'Delete'
        validFrom?: string
        series?: {
            [key: string]: {
                attributes?: (number | null)[]
                observations?: {
                    [key: string]: (number | string | null)[]
                }
            }
        }
    }[]
    structure?: {
        name?: string
        dimensions: {
            dataSet?: SdmxComponent[]
            series?: SdmxComponent[]
            observation?: SdmxComponent[]
        }
        attributes?: {
            dataSet?: SdmxComponent[]
            series?: SdmxComponent[]
            observation?: SdmxComponent[]
        }
    }
    errors?: {
        code: number
        message: string
    }[]
};

// "Oh, we'll get our data directly from the European Central Bank! It'll be fun and more reliable than any random API
// off the internet." - Statements made with incredible naïveté. This service was made for finance perverts and not mere
// mortals such as myself, but I will continue using it in spite of that.
// See also:
// https://github.com/sdmx-twg/sdmx-json/blob/v1.0.0-cts/data-message/docs/1-sdmx-json-field-guide.md
// https://data.ecb.europa.eu/data/datasets/EXR/structure
export class EcbClient {
    readonly requestConfig: ClientConfig;
    private readonly axios: AxiosInstance;

    constructor(config: ClientConfig) {
        this.requestConfig = config;
        this.axios = axios.create({
             baseURL: 'https://data-api.ecb.europa.eu/service/data'
        });
    }

    async getExchangeRate() {
        let response: AxiosResponse<SdmxResponse>;
        try {
             response = await this.axios.get<SdmxResponse>(`/ECB,EXR/${this.requestConfig.seriesKey}`, {
                headers: {
                    Accept: 'application/vnd.sdmx.data+json;version=1.0.0-cts'
                },
                params: {
                    lastNObservations: '1'
                }
            });
        } catch (e) {
            if (isAxiosError(e)) {
                if (e.response != null && 'detail' in e.response.data) {
                    throw new Error(`ECB SDMX query failed with status code ${e.status} - "${e.response.data.detail}"`, { cause: e });
                } else if (e.status != null) {
                    throw new Error(`ECB SDMX query failed with status code ${e.status}`, { cause: e });
                }
            }

            throw e;
        }

        if (response.data.errors != null && response.data.errors.length) {
            throw new Error(`Received errors in ECB SDMX response: ${response.data.errors.map((err) => `${err.code} - ${err.message}`).join(', ')}`);
        }

        if (response.data.dataSets == null || response.data.dataSets.length !== 1) {
            throw new Error(`ECB SDMX response must contain exactly 1 dataset (received ${response.data.dataSets?.length ?? 'none'})`);
        }

        const dataSet = response.data.dataSets[0];
        // I haven't seen anything else come out of this dataset.
        if (dataSet.action !== 'Replace') {
            throw new Error(`Unrecognized ECB SDMX dataset action (received "${dataSet.action}", expected "Replace")`);
        }
        if (dataSet.series == null) {
            throw new Error('ECB SDMX dataset contains no series');
        }

        const dataSetSeries = Object.values(dataSet.series);
        if (dataSetSeries.length !== 1) {
            throw new Error(`ECB SDMX dataset must contain exactly 1 series (received ${dataSetSeries.length})`);
        }
        if (dataSetSeries[0].observations == null) {
            throw new Error(`ECB SDMX dataset series contains no observations`);
        }

        const observations = Object.values(dataSetSeries[0].observations);
        if (observations.length !== 1) {
            throw new Error(`ECB SDMX dataset series must contain exactly 1 observation (received ${observations.length})`);
        }

        const observedValue = observations[0][0];
        if (typeof observedValue !== 'number') {
            throw new Error(`ECB SDMX observation value is not a number (received "${observedValue}")`);
        }

        const observationStructure = response.data.structure?.dimensions?.observation;
        if (observationStructure == null) {
            throw new Error('ECB SDMX structure contains no observation metadata');
        }
        if (observationStructure.length !== 1 || observationStructure[0].values?.length !== 1) {
            throw new Error('ECB SDMX structure must contain exactly one observation time period');
        }

        const observationTimePeriod = observationStructure[0].values[0];
        if (observationTimePeriod.end == null) {
            throw new Error('ECB SDMX observation time period must have an ending date');
        }
        // We ensure the time zone is kept the same so we can properly determine which weekday the observed value is for
        const parsedEndTime = DateTime.fromISO(observationTimePeriod.end, { setZone: true });
        if (!parsedEndTime.isValid) {
            throw new Error('ECB SDMX observation end time is not valid');
        }

        return {
            observedValue: this.requestConfig.invertConversion ? (1 / observedValue) : observedValue,
            observationPeriodEnd: parsedEndTime,
            // According to both the ECB and Norges Bank, exchange reference rates are updated around 16:00 CET every working day.
            estimatedRefreshTime: parsedEndTime.plus({
                days: parsedEndTime.weekday === 5 ? 2 : 0,
                hours: 16,
                minutes: 15
            })
        };
    }
}
