import { padNumber } from 'client-shared/helpers/StringHelper';

export function formatTimer(
    timer: { hours: number, minutes: number, seconds: number, milliseconds: number },
    trimHours = false,
    isSevenSegmentGraphic = false
): string {
    const beforeDecimalPoint = isSevenSegmentGraphic ? ' ' : '';
    const hours = timer.hours === 0 && trimHours
        ? null
        : isSevenSegmentGraphic
            ? formatSevenSegmentHours(timer.hours)
            : timer.hours;
    const minutes = padNumber(timer.minutes);
    const seconds = padNumber(timer.seconds);
    const milliseconds = String(Math.round(timer.milliseconds)).padStart(3, '0')[0];
    if (hours == null) {
        return `${minutes}:${seconds}${beforeDecimalPoint}.${milliseconds}`;
    } else {
        return `${hours}:${minutes}:${seconds}${beforeDecimalPoint}.${milliseconds}`;
    }
}

// Hours above 10 become letters until we run out of letters.
// These letters aren't really readable, but we don't expect a run to go above 10 hours anyway,
// so it's a cute easter egg.
function formatSevenSegmentHours(hours: number): string {
    if (hours > 9 && hours < 36) {
        return String.fromCharCode(55 + hours);
    } else if (hours >= 36) {
        return '?';
    }
    return String(hours);
}
