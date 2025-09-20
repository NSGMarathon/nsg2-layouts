import { ScheduleItem } from '../types/ScheduleHelpers';
import { isBlank } from './StringHelper';

export function isIgnorableScheduleItem(scheduleItem: ScheduleItem | null) {
    return scheduleItem != null
        && scheduleItem.type !== 'SPEEDRUN'
        && isBlank(scheduleItem.description)
        && scheduleItem.talentIds.length === 0;
}
