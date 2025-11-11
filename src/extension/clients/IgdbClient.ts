import type NodeCG from '@nodecg/types';
import type { Configschema, TwitchData } from 'types/schemas';
import { TwitchOauthClient } from './TwitchOauthClient';
import type { AxiosInstance } from 'axios';
import { createTwitchApiClient } from '../helpers/TwitchApiClientHelper';
import PQueue from 'p-queue';

export interface IgdbGameDataResponse {
    id: number
    name: string
    first_release_date?: number
    url: string
    cover?: {
        id: number
        url: string
    }
    external_games?: {
        id: number
        external_game_source: number
        uid: string
        name: string
        url: string
    }[]
    platforms?: {
        id: number
        abbreviation?: string
        name: string
    }[]
    parent_game?: {
        name: string
        first_release_date?: number
        external_games?: {
            id: number
            external_game_source: number
            uid: string
            name: string
            url: string
        }[]
        cover?: {
            id: number
            url: string
        }
    }
}

export class IgdbClient {
    private readonly axios: AxiosInstance;
    private readonly twitchData: NodeCG.ServerReplicantWithSchemaDefault<TwitchData>;
    // IGDB's rate limit is 4 requests per second
    private readonly requestQueue: PQueue = new PQueue({
        intervalCap: 4,
        interval: 1100
    });

    constructor(nodecg: NodeCG.ServerAPI<Configschema>, twitchOauthClient: TwitchOauthClient) {
        this.twitchData = nodecg.Replicant('twitchData') as unknown as NodeCG.ServerReplicantWithSchemaDefault<TwitchData>;
        this.axios = createTwitchApiClient('https://api.igdb.com/v4', nodecg.bundleConfig, this.twitchData, twitchOauthClient);
    }

    async getGame(name: string): Promise<IgdbGameDataResponse[]> {
        const response = await this.requestQueue.add(() => this.axios.post<IgdbGameDataResponse[]>('/games', `
            f name, external_games.category, external_games.url, external_games.uid, cover.url, first_release_date, platforms.abbreviation, platforms.name, url, parent_game.external_games.category, parent_game.external_games.url, parent_game.external_games.uid, parent_game.first_release_date, parent_game.name, parent_game.cover.url;
            w name = "${this.escapeQuotes(name.trim())}" & (external_games.category = 14 | parent_game != null);
            l 500;
        `, {
            headers: {
                'Content-Type': 'text/plain',
                'Accept': 'application/json'
            }
        }), { throwOnTimeout: true });

        return response.data;
    }

    // note on findGamesWithParent:
    // Sometimes a speedrun's title is the name of an expansion to a game (e.g. Splatoon 3: Side Order)
    // Because of that, we also look for games with a parent_game attached while trying to match a Twitch category to
    // have a slightly better chance of finding the right game. If the main game doesn't have a Twitch category, the parent might.
    // This has also helped with mods or side games (e.g. Mario 64 Randomizer)
    // But when we try to match a category to a game manually, we make the logic stricter by only allowing games that
    // have a Twitch category, ignoring the parent game. This reduces duplicate search results.
    async searchGames(query: string, findGamesWithParent: boolean): Promise<IgdbGameDataResponse[]> {
        const response = await this.requestQueue.add(() => this.axios.post<IgdbGameDataResponse[]>('/games', `
            f name, external_games.category, external_games.url, external_games.uid, cover.url, first_release_date, platforms.abbreviation, platforms.name, url, parent_game.external_games.category, parent_game.external_games.url, parent_game.external_games.uid, parent_game.first_release_date, parent_game.name, parent_game.cover.url;
            w external_games.category = 14${findGamesWithParent ? ' | parent_game != null' : ''};
            search "${this.escapeQuotes(query.trim())}";
            l 500;
        `, {
            headers: {
                'Content-Type': 'text/plain',
                'Accept': 'application/json'
            }
        }), { throwOnTimeout: true });

        return response.data;
    }

    isLoggedIn(): boolean {
        return this.twitchData.value.credentials != null;
    }

    private escapeQuotes(value: string): string {
        return value.replaceAll('"', '\"');
    }
}
