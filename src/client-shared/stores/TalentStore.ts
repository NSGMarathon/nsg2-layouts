import { CurrentHostId, Talent } from 'types/schemas';
import { defineStore } from 'pinia';
import { createReplicantStoreInitializer } from 'client-shared/helpers/StoreHelper';
import { formatScheduleItemTalentList, prettyPrintTalentIdList } from 'shared/TalentHelper';
import { ScheduleItem } from 'types/ScheduleHelpers';

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
                return prettyPrintTalentIdList(talentList, id => this.findTalentItemById(id)?.name, maxTalentItems);
            }
        },
        formatSpeedrunTeamList() {
            return (scheduleItem: ScheduleItem) => formatScheduleItemTalentList(scheduleItem, id => this.findTalentItemById(id)?.name);
        }
    }
});

export const initTalentStore = createReplicantStoreInitializer([talent, currentHostId], useTalentStore);
