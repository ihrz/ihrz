/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import { Collection, GuildMember, Message, Snowflake } from 'discord.js';

export namespace AntiSpam {
	export interface CachedMessage {
		messageID: Snowflake;
		guildID: Snowflake;
		authorID: Snowflake;
		channelID: Snowflake;
		content: string;
		sentTimestamp: number;
		isSpam: boolean;
	}

	export interface AntiSpamCache {
		raidInfo: Map<string, Map<string, number | boolean>>;
		messages: Map<string, Set<CachedMessage>>;
		membersToPunish: Map<string, Set<GuildMember>>;
		membersFlags: Map<string, Map<string, number>>;
	}

	export interface AntiSpamOptions {
		BYPASS_ROLES?: string[];
		BYPASS_CHANNELS?: string[];
		ignoreBots: boolean;
		maxInterval: number;
		Enabled: boolean;
		Threshold: number;
		removeMessages: boolean;
		punishment_type: 'mute' | 'kick' | 'ban';
		punishTime: number;
	}
}
