import type NodeCG from '@nodecg/types';
import type { Configschema, OengusData } from 'types/schemas';
import { OengusClient } from '../clients/OengusClient';
import { DateTime } from 'luxon';

export class OengusService {
    private readonly logger: NodeCG.Logger;
    private readonly oengusClient: OengusClient;
    private readonly oengusData: NodeCG.ServerReplicantWithSchemaDefault<OengusData>;
    private tokenValidationTimeout: NodeJS.Timeout | undefined = undefined;

    constructor(nodecg: NodeCG.ServerAPI<Configschema>, oengusClient: OengusClient) {
        this.logger = new nodecg.Logger(`${nodecg.bundleName}:OengusService`);
        this.oengusClient = oengusClient;
        this.oengusData = nodecg.Replicant('oengusData') as unknown as NodeCG.ServerReplicantWithSchemaDefault<OengusData>;

        this.validateToken();
        this.oengusData.on('change', newValue => {
            if (newValue.token != null) {
                // By default, the expiration time for these is apparently set to 7 days.
                // We'll try to stay safe by waiting 24 hours before we refresh the token.
                clearTimeout(this.tokenValidationTimeout);
                this.tokenValidationTimeout = setTimeout(this.validateToken.bind(this), 24 * 60 * 60 * 1000);
            }
        });
    }

    async login(username: string, password: string, twoFactorCode?: string) {
        const token = await this.oengusClient.login(username, password, twoFactorCode);
        if (token == null) {
            throw new Error('Oengus login succeeded without error but yielded no token');
        }
        this.oengusData.value = {
            token,
            tokenLastRefreshed: DateTime.utc().toISO()
        };
        this.logger.debug('Successfully logged in to Oengus');
    }

    async validateToken() {
        if (this.oengusData.value.token == null) {
            this.oengusData.value = {
                token: null,
                tokenLastRefreshed: null
            };
            return;
        }

        try {
            const newToken = await this.oengusClient.refreshToken();
            this.oengusData.value = {
                token: newToken,
                tokenLastRefreshed: DateTime.utc().toISO()
            }
            this.logger.debug('Refreshed Oengus token');
        } catch (e) {
            this.logger.error('Failed to refresh Oengus token:', e instanceof Error ? e.message : String(e));
            this.oengusData.value = {
                token: null,
                tokenLastRefreshed: null
            };
        }
    }
}
