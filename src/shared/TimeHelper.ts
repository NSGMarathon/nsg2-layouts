export function toMetricTime(time: { hours: number, minutes: number, seconds: number, milliseconds: number }) {
    let base = (time.milliseconds / 0.864) + (time.seconds / 0.000864) + (time.minutes / 0.0000144) + (time.hours / 0.00000024);
    const hours = Math.floor(base / 10000000);
    base = base % 10000000;
    const minutes = Math.floor(base / 100000);
    base = base % 100000;
    const seconds = Math.floor(base / 1000);
    base = base % 1000;
    const milliseconds = Math.round(base * 10) / 10;

    return {
        milliseconds,
        seconds,
        minutes,
        hours
    };
}
