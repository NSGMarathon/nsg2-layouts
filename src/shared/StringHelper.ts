export function prettyPrintList(arr: Array<string>): string {
    return arr.reduce((result, item, index) => {
        result += item;

        if (index === arr.length - 2) {
            result += ' & ';
        } else if (index !== arr.length - 1) {
            result += ', ';
        }

        return result;
    }, '');
}

export function isBlank(value: unknown): boolean {
    return typeof value !== 'string' || value.trim() === '';
}
