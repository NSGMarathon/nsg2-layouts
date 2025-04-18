/* prettier-ignore */
/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

export interface Timer {
	state: 'STOPPED' | 'RUNNING' | 'PAUSED' | 'FINISHED';
	lastStartTime: string | null;
	time: Duration;
	teamResults: {
		[k: string]: {
			state: 'FORFEIT' | 'FINISHED';
			time: Duration;
		};
	};
}
export interface Duration {
	hours: number;
	minutes: number;
	seconds: number;
	milliseconds: number;
	rawTime: number;
	timestamp: number;
}
