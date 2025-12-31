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

import { GuildDefaultMessageNotifications, GuildExplicitContentFilter, Snowflake, GuildVerificationLevel } from 'discord.js';
import { AfkData, BanData, ChannelsData, EmojiData, RoleData, WidgetData } from './';
import { MemberData } from './MemberData';

export interface BackupData {
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
