/* prettier-ignore */
/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

export type NextSpeedrun = null | Speedrun;

export interface Speedrun {
	id: string;
	externalId?: string | null;
	title: string;
	type: 'SPEEDRUN';
	twitchCategory?: null | {
		name: string;
		id: string;
		igdbUrl?: string;
	};
	system?: string | null;
	releaseYear?: string | null;
	category?: string | null;
	estimate: string;
	setupTime?: string | null;
	scheduledStartTime: string;
	timerStartTime?: string | null;
	firstGameplayTransitionTime?: string | null;
	relay?: boolean | null;
	emulated?: boolean | null;
	layout?: string | null;
	videoFile?:
		| null
		| (VideoFile & {
				timerStartTime: string;
				timerStopTime: string;
				[k: string]: unknown;
		  });
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
export interface VideoFile {
	name: string;
	path: string;
	type: 'LOCAL_FILE';
	[k: string]: unknown;
}
