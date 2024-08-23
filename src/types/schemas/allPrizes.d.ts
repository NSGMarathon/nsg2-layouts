/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

export type AllPrizes = {
	id: number;
	name: string;
	image?: string;
	minimumBid: number;
	sumDonations: boolean;
	provider?: string;
	startTime?: string;
	startDrawTime?: string;
	endTime?: string;
	endDrawTime?: string;
	startRun?: PrizeStartEndRun;
	endRun?: PrizeStartEndRun;
}[];

export interface PrizeStartEndRun {
	id?: number;
	name?: string;
	displayName?: string;
	order?: number | null;
}
