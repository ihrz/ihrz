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
