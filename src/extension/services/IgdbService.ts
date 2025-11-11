import type NodeCG from '@nodecg/types';
import type { Configschema, Speedrun } from 'types/schemas';
import { IgdbClient, IgdbGameDataResponse } from '../clients/IgdbClient';
import { DateTime } from 'luxon';
import { HasNodecgLogger } from '../helpers/HasNodecgLogger';

export type IgdbGameData = {
    twitchGameId: string
    twitchCategoryUrl?: string
    twitchGameName: string
    name: string
    url: string
    releaseYear?: string
    platforms: { name: string, abbreviation?: string }[]
    boxArtUrl?: string
};

export class IgdbService extends HasNodecgLogger {
    private readonly igdbClient: IgdbClient;

    constructor(nodecg: NodeCG.ServerAPI<Configschema>, igdbClient: IgdbClient) {
        super(nodecg);
        this.igdbClient = igdbClient;
    }

    async findGameForScheduleItem(speedrun: Speedrun): Promise<{ category: Speedrun['twitchCategory'], releaseYear?: string | null } | null> {
        const gameNameWithoutParentheses = speedrun.title.replaceAll(/ \(.*\)$/g, '').trim();
        let exactMatch = await this.getGame(speedrun.title, speedrun.system);
        if (speedrun.title !== gameNameWithoutParentheses && exactMatch == null) {
            exactMatch = await this.getGame(gameNameWithoutParentheses, speedrun.system);
        }
        if (exactMatch != null) {
            this.logger.debug(`Matched Twitch category: ${speedrun.title} -> ${exactMatch.name}`);
            return {
                category: this.replicantTwitchCategoryFrom(exactMatch),
                releaseYear: exactMatch.releaseYear
            };
        }

        const searchResult = await this.searchGames(speedrun.title, true, speedrun.system);
        let matchingSearchResult = searchResult.find(item => item.name.toLowerCase() === speedrun.title.toLowerCase());
        if (matchingSearchResult == null && gameNameWithoutParentheses !== speedrun.title) {
            matchingSearchResult = searchResult.find(item => item.name.toLowerCase() === gameNameWithoutParentheses.toLowerCase());
        }
        if (matchingSearchResult != null) {
            this.logger.debug(`Matched Twitch category: ${speedrun.title} -> ${matchingSearchResult.name}`);
            return {
                category: this.replicantTwitchCategoryFrom(matchingSearchResult),
                releaseYear: matchingSearchResult.releaseYear
            };
        }

        if (searchResult.length > 0) {
            const firstResult = searchResult[0];
            this.logger.warn(`Couldn't find an exact Twitch game match for "${speedrun.title}"! Picking "${firstResult.name}".`);
            return {
                category: this.replicantTwitchCategoryFrom(firstResult),
                releaseYear: firstResult.releaseYear
            };
        }

        this.logger.warn(`Found no Twitch category for speedrun "${speedrun.title}"`);
        return null;
    }

    async getGame(name: string, platform?: string | null): Promise<IgdbGameData | null> {
        const results = await this.igdbClient.getGame(name);
        const gamesWithTwitchCategories = this.getGamesWithTwitchCategories(results);
        let finalResults: IgdbGameDataResponse[] = gamesWithTwitchCategories;
        if (platform != null) {
            const resultsWithMatchingPlatform = gamesWithTwitchCategories.filter(result =>
                result.platforms == null || result.platforms.some(resultPlatform =>
                    resultPlatform.abbreviation?.toLowerCase() === platform.toLowerCase()
                    || resultPlatform.name.toLowerCase() === platform.toLowerCase()));
            if (resultsWithMatchingPlatform.length > 0) {
                finalResults = resultsWithMatchingPlatform;
            }
        }
        if (finalResults.length === 0) {
            return null;
        }
        if (finalResults.length > 1) {
            this.logger.warn(`Found more than one exact match for ${name}! Selecting the first result: ${finalResults[0].url}`);
        }
        return this.mapIgdbResponse(finalResults[0]);
    }

    async searchGames(query: string, findGamesWithParent: boolean, platform?: string | null): Promise<IgdbGameData[]> {
        const results = await this.igdbClient.searchGames(query, findGamesWithParent);
        const gamesWithTwitchCategories = this.getGamesWithTwitchCategories(results);
        let finalResults: IgdbGameDataResponse[] = gamesWithTwitchCategories;
        if (platform != null) {
            const resultsWithMatchingPlatform = gamesWithTwitchCategories.filter(result =>
                result.platforms == null || result.platforms.some(resultPlatform =>
                    resultPlatform.abbreviation?.toLowerCase() === platform.toLowerCase()
                    || resultPlatform.name?.toLowerCase() === platform.toLowerCase()));
            if (resultsWithMatchingPlatform.length > 0) {
                finalResults = resultsWithMatchingPlatform;
            }
        }
        return finalResults.map(result => this.mapIgdbResponse(result));
    }

    isLoggedIn(): boolean {
        return this.igdbClient.isLoggedIn();
    }

    private replicantTwitchCategoryFrom(gameData: IgdbGameData): Speedrun['twitchCategory'] {
        return {
            name: gameData.twitchGameName || gameData.name,
            id: gameData.twitchGameId,
            igdbUrl: gameData.url
        };
    }

    private getGamesWithTwitchCategories(games: IgdbGameDataResponse[]): IgdbGameDataResponse[] {
        return games.filter(result =>
            (result.external_games != null && result.external_games.some(game => game.external_game_source === 14))
            || (result.parent_game?.external_games != null && result.parent_game.external_games.some(game => game.external_game_source === 14)));
    }

    private mapIgdbResponse(data: IgdbGameDataResponse): IgdbGameData {
        let twitchExternalGame = data.external_games?.find(externalGame => externalGame.external_game_source === 14);
        let name = data.name;
        if (twitchExternalGame == null && data.parent_game != null) {
            // For our purposes, we want to show the parent game's name if we are using its twitch category
            name = data.parent_game.name;
            twitchExternalGame = data.parent_game.external_games?.find(externalGame => externalGame.external_game_source === 14);
        }
        if (twitchExternalGame == null) {
            throw new Error(`No Twitch game data found for game ${data.name}`);
        }
        const firstReleaseDate = data.first_release_date ?? data.parent_game?.first_release_date;
        return {
            name,
            url: data.url,
            releaseYear: firstReleaseDate == null ? undefined : String(DateTime.fromSeconds(firstReleaseDate).year),
            twitchCategoryUrl: twitchExternalGame.url,
            twitchGameId: twitchExternalGame.uid,
            twitchGameName: twitchExternalGame.name,
            platforms: (data.platforms ?? []).map(platform => ({ name: platform.name, abbreviation: platform.abbreviation })),
            boxArtUrl: data.cover?.url ?? data.parent_game?.cover?.url
        };
    }
}
