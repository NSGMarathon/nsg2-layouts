export function getContentAdvisoryPresetMessage(type: string) {
    switch (type) {
        case 'PHOTOSENSITIVE_EPILEPSY':
            return 'Warning: This game contains flashing lights.';
        case 'MOTION_SICKNESS':
            return 'Warning: This game may cause motion sickness.';
        case 'GRAPHIC_SCENES':
            return 'Warning: This game contains graphic scenes.';
        default:
            return '';
    }
}
