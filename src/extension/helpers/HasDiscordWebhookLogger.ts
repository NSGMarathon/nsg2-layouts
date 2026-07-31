import { HasNodecgLogger } from './HasNodecgLogger';
import  NodeCG from '@nodecg/types';
import { Configschema } from 'types/schemas';
import { DiscordWebhookClient } from '../clients/DiscordWebhookClient';

export abstract class HasDiscordWebhookLogger extends HasNodecgLogger {
    private readonly discordWebhookClient: DiscordWebhookClient | null;

    protected constructor(nodecg: NodeCG.ServerAPI<Configschema>, discordWebhookClient: DiscordWebhookClient | null) {
        super(nodecg);
        this.discordWebhookClient = discordWebhookClient;
    }

    protected logError(message: string, error: unknown) {
        super.logError(message, error);
        this.discordWebhookClient?.reportError(message, error);
    }

    protected logWarning(message: string) {
        this.logger.warn(message);
        this.discordWebhookClient?.reportWarning(message);
    }
}
