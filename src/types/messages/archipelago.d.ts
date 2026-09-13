export type ArchipelagoItemsSentMessage = {
    receiverName: string
    senderName: string
    items: {
        name: string
        location: string
    }[]
};

export type ArchipelagoItemCheatedMessage = {
    receiverName: string;
    itemName: string;
};

export type ArchipelagoItemHintedMessage = {
    receiverName: string;
    senderName: string;
    itemName: string;
    locationName: string;
}

export type ArchipelagoCountdownMessage = number;

export type ArchipelagoGoaledMessage = { playerName: string };
