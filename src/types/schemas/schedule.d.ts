/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

export interface Schedule {
	source: 'UNKNOWN' | 'OENGUS';
	id?: string;
	sourceSpecificData?: {
		oengus?: {
			scheduleId?: number;
			scheduleSlug?: string;
		};
	};
	items: (Speedrun | OtherScheduleItem)[];
}
export interface Speedrun {
	id: string;
	externalId?: string | null;
	title: string;
	type: 'SPEEDRUN';
	twitchCategory?: string | null;
	system?: string | null;
	releaseYear?: string | null;
	category?: string | null;
	estimate: string;
	setupTime?: string | null;
	scheduledStartTime: string;
	relay?: boolean | null;
	teams: {
		id: string;
		name?: string;
		playerIds: {
			id: string;
			externalId?: string | null;
		}[];
	}[];
	commentatorIds: {
		id: string;
		externalId?: string | null;
	}[];
	[k: string]: unknown;
}
export interface OtherScheduleItem {
	id: string;
	externalId?: string | null;
	title: string;
	type: 'SETUP' | 'OTHER';
	twitchCategory?: string | null;
	estimate: string;
	setupTime?: string | null;
	scheduledStartTime: string;
	talentIds: {
		id: string;
		externalId?: string | null;
	}[];
	[k: string]: unknown;
}