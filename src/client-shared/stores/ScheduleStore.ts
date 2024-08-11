import { ActiveSpeedrun, Schedule } from 'types/schemas';
import { defineStore } from 'pinia';
import { createReplicantStoreInitializer } from 'client-shared/helpers/StoreHelper';

const schedule = nodecg.Replicant<Schedule>('schedule');
const activeSpeedrun = nodecg.Replicant<ActiveSpeedrun>('activeSpeedrun');

interface ScheduleStore {
    schedule: Schedule
    activeSpeedrun: ActiveSpeedrun
}

export const useScheduleStore = defineStore('schedule', {
    state: () => ({
        schedule: null,
        activeSpeedrun: null
    } as unknown as ScheduleStore),
    getters: {
        activeSpeedrunIndex: state => state.activeSpeedrun == null ? -1 : state.schedule.items.findIndex(scheduleItem => scheduleItem.id === state.activeSpeedrun!.id)
    }
});

export const initScheduleStore = createReplicantStoreInitializer([schedule, activeSpeedrun], useScheduleStore);