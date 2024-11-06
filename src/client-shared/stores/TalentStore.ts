import { CurrentHostId, Talent } from 'types/schemas';
import { defineStore } from 'pinia';
import { createReplicantStoreInitializer } from 'client-shared/helpers/StoreHelper';
import { prettyPrintList } from 'shared/StringHelper';

const talent = nodecg.Replicant<Talent>('talent');
const currentHostId = nodecg.Replicant<CurrentHostId>('currentHostId');

interface TalentStore {
    talent: Talent
    currentHostId: CurrentHostId
}

export const useTalentStore = defineStore('talent', {
    state: () => ({
        talent: null,
        currentHostId: null
    } as unknown as TalentStore),
    getters: {
        findTalentItemById: state => (id: string | null | undefined) => id == null ? null : state.talent.find(talentItem => talentItem.id === id),
        formatTalentIdList() {
            return (talentList: { id: string }[], maxTalentItems?: number) => {
                if (maxTalentItems != null && talentList.length > maxTalentItems) {
                    const firstTalentItems = talentList
                        .slice(0, maxTalentItems)
                        .map(talentId => this.findTalentItemById(talentId.id)?.name ?? `Unknown Talent ${talentId.id}`);
                    return prettyPrintList([...firstTalentItems, talentList.length === maxTalentItems + 1 ? '1 other' : `${talentList.length - maxTalentItems} others`]);
                }
                return prettyPrintList(talentList.map(talentId => this.findTalentItemById(talentId.id)?.name ?? `Unknown Talent ${talentId.id}`));
            }
        },
        formatSpeedrunTeamList() {
            return (teams: { playerIds: { id: string }[] }[]) => {
                const playerCount = teams.reduce((result, team) => {
                    result += team.playerIds.length;
                    return result;
                }, 0);

                if (playerCount === 0) {
                    return 'No players?!';
                } else if (playerCount >= 6) {
                    return `${playerCount} players`;
                }

                return teams.reduce((result, team, index, array) => {
                    result += prettyPrintList(team.playerIds.map(playerId =>
                        this.findTalentItemById(playerId.id)?.name ?? `Unknown Talent ${playerId.id}`));
                    if (index !== array.length - 1) {
                        result += ' vs. ';
                    }
                    return result;
                }, '');
            }
        }
    }
});

export const initTalentStore = createReplicantStoreInitializer([talent, currentHostId], useTalentStore);
