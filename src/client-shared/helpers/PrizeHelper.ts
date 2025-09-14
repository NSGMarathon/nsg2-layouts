// Originally from the GDQ donation tracker, licensed under the Apache License 2.0
// https://github.com/GamesDoneQuick/donation-tracker/blob/17639ce335de33767b1fd4389e2d6f718435032e/LICENSE

import { DateTime } from 'luxon';
import { AllPrizes } from 'types/schemas';
import compact from 'lodash/compact';

// Because timestamps are estimates at best, we only want to show relative
// times when they are within a certain range. Too far out and the schedule is
// likely to change before the time window arrives. Too close and we can't be
// sure that the displayed time is accurate enough.
//
// These numbers configure the furthest and closest times that we will show
// relative times in the description of the card. They are mostly arbitrary.
const ALLOWED_ESTIMATED_TIMES = [
    { time: 15 * 60 * 1000, display: 'in about 15 minutes' },
    { time: 30 * 60 * 1000, display: 'in about 30 minutes' },
    { time: 45 * 60 * 1000, display: 'in about 45 minutes' },
    { time: 60 * 60 * 1000, display: 'in about 1 hour' },
    { time: 1.5 * 60 * 60 * 1000, display: 'in about 1.5 hours' },
    { time: 2.25 * 60 * 60 * 1000, display: 'in about 2 hours' },
    { time: 3.25 * 60 * 60 * 1000, display: 'in about 3 hours' },
    { time: 4.25 * 60 * 60 * 1000, display: 'in about 4 hours' },
];
const MAX_ESTIMATED_TIME = ALLOWED_ESTIMATED_TIMES[ALLOWED_ESTIMATED_TIMES.length - 1].time;

// The maximum time differential across day boundaries within which only times
// will be displayed. For example, using a limit of 11 hours: at 11pm on day 1,
// a prize closing at 3am on day 2 will show `Closes at 3:00AM`, but a prize
// closing at 11am on day 2 will show `Closes <day 2>`.
const EXACT_TIME_RELATIVE_LIMIT = 11 * 60 * 60 * 1000;

// Returns a string representation of the relative duration given as `millis`.
// For example, 8 minutes (8 * 60 * 1000 millis) would return the string
// "about 15 minutes" with the default configuration.
//
// If the given duration is longer than the maximum allowed relative time,
// or if it is less than or equal to 0, `undefined` is returned instead.
function getDisplayableEstimatedTime(millis: number): string | undefined {
    if (millis <= 0 || millis > MAX_ESTIMATED_TIME) return undefined;

    const nearestEstimate = ALLOWED_ESTIMATED_TIMES.find(({ time }) => millis < time);
    return nearestEstimate != null ? nearestEstimate.display : undefined;
}

// Returns a string representation of an exact time. The exact representation
// is dependent on the distance to `now`.
function getDisplayableExactTime(now: DateTime, targetTime: DateTime) {
    if (targetTime.hasSame(now, 'day') || targetTime.diff(now).valueOf() < EXACT_TIME_RELATIVE_LIMIT) {
        return targetTime.toLocaleString({
            hour: 'numeric',
            minute: '2-digit',
            timeZoneName: 'short',
        });
    }

    return targetTime.toLocaleString(DateTime.DATE_MED);
}

// Determine an appropriate description for the time frame that `prize` will be
// available for bidding, relative to `now`.
//
// For prizes that have exact open and close times, a closely-estimated time
// will be used for the description. For run-relative time frames, a more
// lenient estimate is used to account for schedule variation. The semantics
// below applies only to run-relative time frames.
//
// - now before startTime and outside window = just start run name
// - now before startTime and inside window = nearest time to start and start run name
// - now before endTime and outside window = end run name
// - now before endTime and inside window = nearest time to end and end run name
// - now after endTime = "No longer available for bidding".
export const getPrizeRelativeAvailability = (prize: AllPrizes[number]): { closed: boolean, waiting: boolean, message: string } => {
    const startTime = prize.startTime == null ? null : DateTime.fromISO(prize.startTime);
    const endTime = prize.endTime == null ? null : DateTime.fromISO(prize.endTime);
    const startDrawTime = prize.startDrawTime == null ? null : DateTime.fromISO(prize.startDrawTime);
    const endDrawTime = prize.endDrawTime == null ? null : DateTime.fromISO(prize.endDrawTime);

    // If no time bound is set, assume the prize is available for the entire
    // duration of the event.
    if (startDrawTime == null || endDrawTime == null) {
        return { closed: false, waiting: false, message: 'Available all event long!' };
    }

    // If the current time is past the end of the availability window, it is
    // considered closed.
    const now = DateTime.local();
    if (now > endDrawTime) {
        return { closed: true, waiting: false, message: 'No longer available for bidding.' };
    }

    // If exact start and end times are given, we can render that time directly.
    if (startTime != null && now < startTime) {
        return { closed: true, waiting: true, message: `Opens at ${getDisplayableExactTime(now, startTime)}` };
    } else if (endTime != null && now < endTime) {
        return { closed: false, waiting: false, message: `Open until ${getDisplayableExactTime(now, endTime)}` };
    }

    const isOpening = now < startDrawTime;
    const relevantTimeBoundary = isOpening ? startDrawTime : endDrawTime;
    const relevantRunBoundary = isOpening ? prize.startRun : prize.endRun;
    const relativeTime = getDisplayableEstimatedTime(relevantTimeBoundary.diff(now).valueOf());

    let runDescription = null;
    if (relevantRunBoundary != null) {
        runDescription = isOpening ? `when ${relevantRunBoundary.name} starts` : `when ${relevantRunBoundary.name} ends`;
    }

    const description = compact([runDescription, relativeTime]).join(', ');
    return isOpening
        ? { closed: true, waiting: true, message: `Opens ${description}` }
        : { closed: false, waiting: false, message: `Closes ${description}` };
};
