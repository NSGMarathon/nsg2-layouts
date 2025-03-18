import { AxiosInstance, isAxiosError } from 'axios';
import type NodeCG from '@nodecg/types';
import type { Configschema, TwitchData } from 'types/schemas';
import axios from 'axios';
import { REQUIRED_TWITCH_TOKEN_SCOPES } from 'shared/TwitchHelpers';
import { HasNodecgLogger } from '../helpers/HasNodecgLogger';

interface TwitchOauthTokenResponse {
    access_token: string
    expires_in: number
    refresh_token: string
    scope: string[]
    token_type: string
}

interface TwitchOauthValidateResponse {
    client_id: string
    login: string
    scopes: string[]
    user_id: string
    expires_in: number
}

export class TwitchOauthClient extends HasNodecgLogger {
    private readonly axios: AxiosInstance;
    private readonly clientId: string;
    private readonly clientSecret: string;
    private readonly redirectUri: string;
    private readonly twitchData: NodeCG.ServerReplicantWithSchemaDefault<TwitchData>;

    constructor(nodecg: NodeCG.ServerAPI<Configschema>) {
        super(nodecg);
        if (!TwitchOauthClient.hasRequiredConfig(nodecg)) {
            throw new Error('Twitch API config is missing');
        }

        this.axios = axios.create({
            baseURL: 'https://id.twitch.tv'
        });
        this.clientId = nodecg.bundleConfig.twitch!.clientId!;
        this.clientSecret = nodecg.bundleConfig.twitch!.clientSecret!;
        this.redirectUri = nodecg.bundleConfig.twitch!.redirectUri!;
        this.twitchData = nodecg.Replicant('twitchData') as unknown as NodeCG.ServerReplicantWithSchemaDefault<TwitchData>;

        const tokenValidationLoop = () => {
            this.validateToken().catch(e => {
                this.logger.error('Error validating Twitch token', e);
            });
        };
        tokenValidationLoop();
        setInterval(tokenValidationLoop, 60 * 60 * 1000);
    }

    async validateToken(): Promise<void> {
        this.logger.debug('Validating Twitch token');
        if (this.twitchData.value.credentials == null) {
            this.logger.debug('Twitch token is not set');
            this.twitchData.value = {
                state: 'NOT_LOGGED_IN',
                syncEnabled: this.twitchData.value.syncEnabled
            };
            return;
        }

        this.twitchData.value.state = 'AUTHENTICATING';
        try {
            const validateResponse = await this.axios.get<TwitchOauthValidateResponse>('/oauth2/validate', {
                headers: {
                    Authorization: `OAuth ${this.twitchData.value.credentials.accessToken}`
                }
            });

            if (!this.hasRequiredScopes(validateResponse.data.scopes)) {
                this.logger.error('Twitch access token is missing one or more required scopes');
                this.twitchData.value = {
                    ...this.twitchData.value,
                    state: 'NOT_LOGGED_IN',
                    loggedInUser: undefined,
                    credentials: undefined
                };
                return;
            }

            this.logger.debug('Twitch token is valid');
            this.twitchData.value = {
                ...this.twitchData.value,
                state: 'LOGGED_IN',
                loggedInUser: {
                    username: validateResponse.data.login,
                    id: validateResponse.data.user_id
                }
            };
        } catch (e) {
            if (isAxiosError(e) && e.response?.status === 401) {
                this.logger.debug('Twitch token validation returned HTTP 401, refreshing token');
                await this.refreshToken()
                    .then(() => {
                        this.twitchData.value.state = 'LOGGED_IN';
                    })
                    .catch(e => {
                        this.logger.error('Failed to refresh Twitch token', e instanceof Error ? e.message : String(e));
                        this.logger.debug('Failed to refresh Twitch token', e);
                        this.twitchData.value = {
                            state: 'NOT_LOGGED_IN',
                            syncEnabled: this.twitchData.value.syncEnabled
                        };
                    });
            } else {
                this.logger.debug('Twitch token validation returned unknown error:', e);
                this.twitchData.value = {
                    state: 'NOT_LOGGED_IN',
                    syncEnabled: this.twitchData.value.syncEnabled
                };
            }
        }
    }

    async refreshToken(): Promise<{ accessToken: string }> {
        if (this.twitchData.value.credentials?.refreshToken == null) {
            throw new Error('Twitch refresh token is unset');
        }

        this.logger.debug('Refreshing Twitch token');
        const refreshResponse = await this.axios.post<TwitchOauthTokenResponse>('/oauth2/token', {
            client_id: this.clientId,
            client_secret: this.clientSecret,
            grant_type: 'refresh_token',
            refresh_token: this.twitchData.value.credentials.refreshToken
        }, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (!this.hasRequiredScopes(refreshResponse.data.scope)) {
            throw new Error('Twitch access token is missing one or more required scopes');
        }

        this.twitchData.value.credentials = {
            accessToken: refreshResponse.data.access_token,
            refreshToken: refreshResponse.data.refresh_token
        };
        this.logger.debug('Refreshed Twitch token');
        return {
            accessToken: refreshResponse.data.access_token
        };
    }

    async getToken(authorizationCode: string): Promise<void> {
        this.twitchData.value.state = 'AUTHENTICATING';
        try {
            const tokenResponse = await this.axios.post<TwitchOauthTokenResponse>('/oauth2/token', {
                client_id: this.clientId,
                client_secret: this.clientSecret,
                code: authorizationCode,
                grant_type: 'authorization_code',
                redirect_uri: this.redirectUri
            }, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            this.twitchData.value.credentials = {
                accessToken: tokenResponse.data.access_token,
                refreshToken: tokenResponse.data.refresh_token
            }
        } catch (e) {
            this.logger.error('Error getting Twitch token');
            this.twitchData.value = {
                state: 'NOT_LOGGED_IN',
                syncEnabled: this.twitchData.value.syncEnabled
            };
            return;
        }

        await this.validateToken();
    }

    private hasRequiredScopes(scopes: string[]): boolean {
        return !REQUIRED_TWITCH_TOKEN_SCOPES.some(requiredScope => !scopes.some(tokenScope => tokenScope === requiredScope));
    }

    static hasRequiredConfig(nodecg: NodeCG.ServerAPI<Configschema>): boolean {
        const twitchConfig = nodecg.bundleConfig.twitch;
        if (twitchConfig == null) return false;
        return [
            twitchConfig.clientId,
            twitchConfig.clientSecret,
            twitchConfig.redirectUri
        ].every(configItem => configItem != null);
    }
}
