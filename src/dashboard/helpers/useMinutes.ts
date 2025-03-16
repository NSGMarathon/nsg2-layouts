import { ref } from 'vue';
import { DateTime } from 'luxon';

const minutes = ref(0);
// Update at the start of every minute
setTimeout(() => {
    minutes.value = DateTime.now().minute;
    setInterval(() => {
        minutes.value = DateTime.now().minute;
    }, 60 * 1000);
}, (60 - DateTime.now().second) * 1000);

// We display some values on the dashboard (mostly relative dates, e.g. "3 minutes ago") that we'd like to update
// once every minute. This works to facilitate that.
export function useMinutes() {
    return minutes;
}
