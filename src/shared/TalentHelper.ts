import { ScheduleItem } from '../types/ScheduleHelpers';
import { isBlank, prettyPrintList } from './StringHelper';

export function formatScheduleItemTalentList(scheduleItem: ScheduleItem, talentNameGetter: (id: string) => string | undefined | null): string {
    if (scheduleItem.type === 'SPEEDRUN') {
        const maxTalentItemsPerTeam = scheduleItem.teams.length > 1 ? 3 : 6;
        return scheduleItem.teams.reduce((result, team, index, array) => {
            result += isBlank(team.name) ? prettyPrintTalentIdList(team.playerIds, talentNameGetter, maxTalentItemsPerTeam) : team.name;
            if (index !== array.length - 1) {
                result += ' vs. ';
            }
            return result;
        }, '');
    } else {
        return prettyPrintTalentIdList(scheduleItem.talentIds, talentNameGetter);
    }
}

export function prettyPrintTalentIdList(talentIds: { id: string }[], talentNameGetter: (id: string) => string | undefined | null, maxItems = 4): string {
    const uniqueTalentIds = Array.from(new Set(talentIds.map(talentId => talentId.id)));
    const nameList = uniqueTalentIds
        .map(talentId => talentNameGetter(talentId))
        .filter(talentName => talentName != null);
    if (nameList.length === 0) {
        return '(Somebody?)';
    }
    const slicedNameList = nameList.slice(0, maxItems);
    if (uniqueTalentIds.length !== slicedNameList.length) {
        const overflowCount = uniqueTalentIds.length - slicedNameList.length;
        slicedNameList.push(overflowCount === 1 ? '1 other' : `${overflowCount} others`);
    }
    return prettyPrintList(slicedNameList);
}
