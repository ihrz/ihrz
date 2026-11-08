/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2026 iHorizon
*/

import {
	GuildDefaultMessageNotifications,
	GuildExplicitContentFilter,
	Snowflake,
	GuildVerificationLevel
} from "discord.js";
import {
	AfkData,
	BanData,
	ChannelsData,
	EmojiData,
	RoleData,
	WidgetData
} from "./";
import { MemberData } from "./MemberData";
import type { BackupComponent } from "../components";


export interface StickerData {
	name: string;
	description: string | null;
	tags: string;
	format: number;
	base64: string;
}

export interface AutomodData {
	name: string;
	eventType: number;
	triggerType: number;
	triggerMetadata: {
		keywordFilter: string[];
		regexPatterns: string[];
		presets: number[];
		allowList: string[];
		mentionTotalLimit: number | null;
		mentionRaidProtectionEnabled: boolean;
	};
	actions: {
		type: number;
		channel: string | null;
		durationSeconds?: number | null;
		customMessage?: string | null;
	}[];
	enabled: boolean;
	exemptRoles: string[];
	exemptChannels: string[];
}

export interface EventData {
	name: string;
	description: string | null;
	start: number;
	end: number | null;
	entityType: number;
	privacyLevel: number;
	channel: string | null;
	location: string | null;
}

export interface WelcomeScreenData {
	enabled: boolean;
	description: string | null;
	channels: { channel: string; description: string; emoji: string | null }[];
}

export interface BackupData {
	version?: number;
	components?: BackupComponent[];
	/** Selected parts that could not be read: left out of `components`. */
	incomplete?: BackupComponent[];
	description?: string | null;
	preferredLocale?: string;
	premiumProgressBarEnabled?: boolean;
	systemChannelFlags?: number;
	systemChannel?: string | null;
	rulesChannel?: string | null;
	publicUpdatesChannel?: string | null;
	safetyAlertsChannel?: string | null;
	welcomeScreen?: WelcomeScreenData;
	stickers?: StickerData[];
	automod?: AutomodData[];
	events?: EventData[];
	name: string;
	iconURL?: string | null;
	iconBase64?: string | null;
	verificationLevel: GuildVerificationLevel;
	explicitContentFilter: GuildExplicitContentFilter;
	defaultMessageNotifications: GuildDefaultMessageNotifications | number;
	afk: AfkData | null;
	widget: WidgetData;
	splashURL?: string | null;
	splashBase64?: string | null;
	bannerURL?: string | null;
	bannerBase64?: string | null;
	channels: ChannelsData;
	roles: RoleData[];
	bans: BanData[];
	emojis: EmojiData[];
	members: MemberData[];
	createdTimestamp: number;
	guildID: string;
	id: Snowflake;
}
