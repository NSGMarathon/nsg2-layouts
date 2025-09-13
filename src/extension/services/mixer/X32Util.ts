export function dbToFloat(d: number): number {
    let f: number
    if (d < -60) {
        f = (d + 90) / 480
    } else if (d < -30) {
        f = (d + 70) / 160
    } else if (d < -10) {
        f = (d + 50) / 80
    } else if (d <= 10) {
        f = (d + 30) / 40
    } else {
        f = 1
    }
    // Optionally round “f” to a X32 known value
    return f // Math.round((f * 1023.5) / 1023.0)
}

export function floatToDB(f?: number): number {
    if (f == null) {
        return -90;
    } else if (f >= 0.5) {
        return f * 40 - 30 // max dB value: +10.
    } else if (f >= 0.25) {
        return f * 80 - 50
    } else if (f >= 0.0625) {
        return f * 160 - 70
    } else if (f >= 0.0) {
        return f * 480 - 90 // min dB value: -90 or -oo
    } else {
        return -90;
    }
}
