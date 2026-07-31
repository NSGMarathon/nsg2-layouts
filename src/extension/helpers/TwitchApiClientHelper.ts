import type NodeCG from '@nodecg/types';
import { Configschema, TwitchData } from 'types/schemas';
import { TwitchOauthClient } from '../clients/TwitchOauthClient';
import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { DeepReadonly } from 'ts-essentials';

export function createTwitchApiClient(
    baseURL: string,
    bundleConfig: DeepReadonly<Configschema>,
    twitchData: NodeCG.ServerReplicantWithSchemaDefault<TwitchData>,
    twitchOauthClient: TwitchOauthClient
): AxiosInstance {
    const axiosInstance = axios.create({
        baseURL
    });
    axiosInstance.interceptors.request.use((config) => {
        if (bundleConfig.twitch?.clientId == null) {
            throw new Error('Twitch client ID is missing');
        }
        if (twitchData.value.credentials == null) {
            throw new Error('Not logged in to Twitch');
        }
        config.headers.Authorization = `Bearer ${twitchData.value.credentials.accessToken}`;
        config.headers['Client-Id'] = bundleConfig.twitch.clientId;
        return config;
    });
    axiosRetry(axiosInstance, {
        retries: 1,
        retryCondition: error => {
            return error.response?.status === 401 && twitchData.value.credentials != null;
        },
        onRetry: async () => {
            await twitchOauthClient.refreshToken();
        }
    });
    return axiosInstance;
}
