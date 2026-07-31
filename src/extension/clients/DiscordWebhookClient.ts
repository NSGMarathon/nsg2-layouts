import { HasNodecgLogger } from '../helpers/HasNodecgLogger';
import type NodeCG from '@nodecg/types';
import type { Configschema } from 'types/schemas';
import type { AxiosInstance } from 'axios';
import axios from 'axios';

export class DiscordWebhookClient extends HasNodecgLogger {
    private readonly axios: AxiosInstance;
    private readonly mentions: readonly string[];

    constructor(nodecg: NodeCG.ServerAPI<Configschema>) {
        super(nodecg);

        if (!DiscordWebhookClient.hasRequiredConfig(nodecg)) {
            throw new Error('Discord webhook URL is not configured');
        }

        this.axios = axios.create({
            baseURL: nodecg.bundleConfig.errorReporting!.discord!.webhookUrl
        });
        this.mentions = nodecg.bundleConfig.errorReporting?.discord?.mentions ?? [];
    }

    async reportError(message: string, error: unknown) {
        return this.executeWebhook(`[Error] ${message}${error == null ? '' : ': ' + this.formatError(error)}\n${this.mentions.map(mention => `<@${mention}>`).join(' ')}`);
    }

    async reportWarning(message: string) {
        return this.executeWebhook(`[Warning] ${message}`);
    }

    private async executeWebhook(content: string) {
        return this.axios.post('', {
            content
        }).catch(e => {
            this.logError('Failed to execute Discord webhook', e);
        });
    }

    static hasRequiredConfig(nodecg: NodeCG.ServerAPI<Configschema>): boolean {
        return nodecg.bundleConfig.errorReporting?.discord?.webhookUrl != null;
    }
}
