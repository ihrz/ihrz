/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import { Client } from "discord.js";

// Type definition for guild data
export interface GuildData {
	name: string;
	memberCount: number;
	preferredLocale: string;
	iconURL: string | null;
	joinedTimestamp: number | null;
	vanityURLCode?: string | null;
}

export async function getGuildData(client: Client, guildId: string): Promise<GuildData | null> {
	if (!client.shard) {
		// No sharding - use local cache
		const guild = client.guilds.cache.get(guildId);
		return guild ? {
			name: guild.name,
			memberCount: guild.memberCount,
			preferredLocale: guild.preferredLocale,
			iconURL: guild.iconURL(),
			joinedTimestamp: guild.joinedTimestamp,
			vanityURLCode: guild.vanityURLCode
		} : null;
	}

	// With sharding - broadcast to find the guild
	const guildResults = await client.shard.broadcastEval(
		(client, { guildId }) => {
			const guild = client.guilds.cache.get(guildId);
			return guild ? {
				name: guild.name,
				memberCount: guild.memberCount,
				preferredLocale: guild.preferredLocale,
				iconURL: guild.iconURL(),
				joinedTimestamp: guild.joinedTimestamp,
				vanityURLCode: guild.vanityURLCode
			} : null;
		},
		{ context: { guildId } }
	);

	// Find the result that isn't null
	return guildResults.find(result => result !== null) || null;
}

// Alternative: More specific typed version with optional properties
export interface DetailedGuildData {
	name: string;
	memberCount: number;
	preferredLocale: string;
	iconURL?: string | null;
	joinedTimestamp?: number | null;
	vanityURLCode?: string | null;
	ownerId?: string;
	createdTimestamp?: number;
	description?: string | null;
}

export async function getDetailedGuildData(client: Client, guildId: string): Promise<DetailedGuildData | null> {
	if (!client.shard) {
		// No sharding - use local cache
		const guild = client.guilds.cache.get(guildId);
		return guild ? {
			name: guild.name,
			memberCount: guild.memberCount,
			preferredLocale: guild.preferredLocale,
			iconURL: guild.iconURL(),
			joinedTimestamp: guild.joinedTimestamp,
			vanityURLCode: guild.vanityURLCode,
			ownerId: guild.ownerId,
			createdTimestamp: guild.createdTimestamp,
			description: guild.description
		} : null;
	}

	// With sharding - broadcast to find the guild
	const guildResults = await client.shard.broadcastEval(
		(client, { guildId }) => {
			const guild = client.guilds.cache.get(guildId);
			return guild ? {
				name: guild.name,
				memberCount: guild.memberCount,
				preferredLocale: guild.preferredLocale,
				iconURL: guild.iconURL(),
				joinedTimestamp: guild.joinedTimestamp,
				vanityURLCode: guild.vanityURLCode,
				ownerId: guild.ownerId,
				createdTimestamp: guild.createdTimestamp,
				description: guild.description
			} : null;
		},
		{ context: { guildId } }
	);

	// Find the result that isn't null
	return guildResults.find(result => result !== null) || null;
}