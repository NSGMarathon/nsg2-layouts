/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

export interface Configschema {
	intermission?: {
		addVisualizerSpace?: boolean;
		addCameraSpace?: boolean;
		[k: string]: unknown;
	};
	obs?: {
		sceneDataInTransitionEvents?: boolean;
		[k: string]: unknown;
	};
	event?: {
		timezone: string;
		name?: string;
		donationUrl?: string;
		currency?: {
			code?: string;
			unit?: string;
			[k: string]: unknown;
		};
		[k: string]: unknown;
	};
	oengus?: {
		useSandbox?: boolean;
		[k: string]: unknown;
	};
	tracker?: {
		address?: string;
		socketAddress?: string;
		username?: string;
		password?: string;
		eventId?: number;
		[k: string]: unknown;
	};
	twitch?: {
		clientId?: string;
		clientSecret?: string;
		redirectUri?: string;
		titleTemplates?: {
			speedrun: string;
			race?: string;
			other: string;
			withoutTalent: string;
			fallback: string;
			[k: string]: unknown;
		};
		[k: string]: unknown;
	};
	foobar2000?: {
		address?: string;
		username?: string;
		password?: string;
		[k: string]: unknown;
	};
	x32?: {
		address?: string;
		transitionFps?: number;
		defaultSpeakingDBThreshold?: number;
		disableNameplateVolumeMeters?: boolean;
		transitionDurations?: {
			mute?: number;
			unmute?: number;
			[k: string]: unknown;
		};
		channelMapping?: {
			runners?: ChannelItem[];
			games?: ChannelItem[];
			[k: string]: unknown;
		};
		[k: string]: unknown;
	};
	[k: string]: unknown;
}
export interface ChannelItem {
	number: number;
	type: 'CHANNEL' | 'AUX_IN' | 'FX_RETURN' | 'BUS' | 'MATRIX' | 'DCA';
}
