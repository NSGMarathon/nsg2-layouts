import { DateTime, Duration } from 'luxon';
import { ScheduleItem } from 'types/ScheduleHelpers';
import { Configschema } from 'types/schemas';

export const CURRENCY_CODE = (nodecg.bundleConfig as Configschema).event?.currency?.code ?? 'NOK';
export const CURRENCY_UNIT = (nodecg.bundleConfig as Configschema).event?.currency?.unit ?? 'kr';

export function addDots(value: string, maxLength?: number): string;
export function addDots(value: string | undefined | null, maxLength?: number): string | undefined | null;
export function addDots(value: string | undefined | null, maxLength = 48): string | undefined | null {
    const rolloff = '...';

    if (!value) return value;
    if (value.length > maxLength) {
        return value.substring(0, maxLength - rolloff.length) + rolloff;
    }

    return value;
}

export function formatScheduleItemEstimate(scheduleItem: ScheduleItem): string {
    const estimate = Duration.fromISO(scheduleItem.estimate);
    // If a schedule item has a zero-second estimate, try using the setup time instead
    if (estimate.as('seconds') === 0) {
        if (scheduleItem.setupTime == null) {
            return formatDuration('PT0S');
        } else {
            return formatDuration(scheduleItem.setupTime);
        }
    } else {
        return formatDuration(scheduleItem.estimate);
    }
}

export function formatDuration(duration: string): string {
    return Duration.fromISO(duration).toFormat('h:mm:ss');
}

export function padNumber(number: unknown, minLength = 2): string {
    if (typeof number !== 'number' && typeof number !== 'string') return '';
    return String(number).padStart(minLength, '0');
}

export function formatNumber(number: number): string {
    return new Intl.NumberFormat('et-EE', { maximumFractionDigits: 0 }).format(Math.floor(number));
}

export function formatCurrencyAmount(number: number, alwaysShowDecimals = false, addCurrencyUnit = true): string {
    // i don't like this solution, but it works how i want it to
    if (alwaysShowDecimals || number % 1 !== 0) {
        return new Intl.NumberFormat('et-EE', { useGrouping: 'min2', minimumFractionDigits: 2 }).format(number).replaceAll(',', '.') + (addCurrencyUnit ? CURRENCY_UNIT : '');
    } else {
        return new Intl.NumberFormat('et-EE', { useGrouping: 'min2', minimumFractionDigits: 0 }).format(number) + (addCurrencyUnit ? CURRENCY_UNIT : '');
    }
}

export function shortenLargeNumber(number: number): string {
    if (number < 1000) {
        return String(number);
    } else if (number < 100000) {
        // "12.5K" makes sense, while "125.5K" is less defensible, hence the distinction.
        return `${Math.floor(number / 100) / 10}K`;
    } else if (number < 1000000) {
        return `${Math.floor(number / 1000)}K`;
    } else {
        return `${Math.floor(number / 100000) / 10}M`;
    }
}

export function formatScheduledStartTime(scheduledStartTime: string): string {
    const parsedStartTime = DateTime.fromISO(scheduledStartTime);
    const relativeStartTime = parsedStartTime.toRelative({ unit: ['days', 'hours', 'minutes'] });
    const now = DateTime.now();
    const tomorrow = now.plus({ days: 1 });
    let date: string;
    if (parsedStartTime.year === now.year && parsedStartTime.month === now.month && parsedStartTime.day === now.day) {
        date = 'Scheduled for ';
    } else if (parsedStartTime.year === tomorrow.year && parsedStartTime.month === tomorrow.month && parsedStartTime.day === tomorrow.day) {
        date = 'Tomorrow at';
    } else {
        date = parsedStartTime.toISODate() + ' at';
    }

    return `${date} ${parsedStartTime.setLocale('en-GB').toLocaleString(DateTime.TIME_24_SIMPLE)} - ${relativeStartTime}`;
}
