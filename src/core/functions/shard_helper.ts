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

export async function getGuildData(
	client: Client,
	guildId: string
): Promise<GuildData | null> {
	if (!client.shard) {
		// No sharding - use local cache
		const guild = client.guilds.cache.get(guildId);
		return guild
			? {
					name: guild.name,
					memberCount: guild.memberCount,
					preferredLocale: guild.preferredLocale,
					iconURL: guild.iconURL(),
					joinedTimestamp: guild.joinedTimestamp,
					vanityURLCode: guild.vanityURLCode
				}
			: null;
	}

	// With sharding - broadcast to find the guild
	const guildResults = await client.shard.broadcastEval(
		(client, { guildId }) => {
			const guild = client.guilds.cache.get(guildId);
			return guild
				? {
						name: guild.name,
						memberCount: guild.memberCount,
						preferredLocale: guild.preferredLocale,
						iconURL: guild.iconURL(),
						joinedTimestamp: guild.joinedTimestamp,
						vanityURLCode: guild.vanityURLCode
					}
				: null;
		},
		{ context: { guildId } }
	);

	// Find the result that isn't null
	return guildResults.find((result) => result !== null) || null;
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

export async function getDetailedGuildData(
	client: Client,
	guildId: string
): Promise<DetailedGuildData | null> {
	if (!client.shard) {
		// No sharding - use local cache
		const guild = client.guilds.cache.get(guildId);
		return guild
			? {
					name: guild.name,
					memberCount: guild.memberCount,
					preferredLocale: guild.preferredLocale,
					iconURL: guild.iconURL(),
					joinedTimestamp: guild.joinedTimestamp,
					vanityURLCode: guild.vanityURLCode,
					ownerId: guild.ownerId,
					createdTimestamp: guild.createdTimestamp,
					description: guild.description
				}
			: null;
	}

	// With sharding - broadcast to find the guild
	const guildResults = await client.shard.broadcastEval(
		(client, { guildId }) => {
			const guild = client.guilds.cache.get(guildId);
			return guild
				? {
						name: guild.name,
						memberCount: guild.memberCount,
						preferredLocale: guild.preferredLocale,
						iconURL: guild.iconURL(),
						joinedTimestamp: guild.joinedTimestamp,
						vanityURLCode: guild.vanityURLCode,
						ownerId: guild.ownerId,
						createdTimestamp: guild.createdTimestamp,
						description: guild.description
					}
				: null;
		},
		{ context: { guildId } }
	);

	// Find the result that isn't null
	return guildResults.find((result) => result !== null) || null;
}

// Public data of the guilds reaching a member threshold, across all shards
export interface CommunityGuildData {
	name: string;
	avatar: string | null;
	members: number;
}

export async function getCommunityGuildsData(
	client: Client,
	minMembers: number
): Promise<CommunityGuildData[]> {
	const collect = (c: Client, { minMembers }: { minMembers: number }) =>
		c.guilds.cache
			.filter(
				(guild) =>
					guild.available &&
					(guild.memberCount || guild.approximateMemberCount || 0) >=
						minMembers
			)
			.map((guild) => ({
				name: guild.name,
				avatar: guild.iconURL({ extension: "png", size: 512 }),
				members: guild.memberCount || guild.approximateMemberCount || 0
			}));

	if (!client.shard) {
		// No sharding - use local cache
		return collect(client, { minMembers });
	}

	// With sharding - broadcast to collect every shard's guilds
	const guildResults = await client.shard.broadcastEval(collect, {
		context: { minMembers }
	});

	return guildResults.flat();
}

export interface ShardGuildSample {
	id: string;
	name: string;
}

export interface ShardData {
	pid: number;
	// discord.js Status: 0 is Ready.
	status: number;
	// -1 until the first heartbeat is acknowledged.
	ping: number;
	uptime: number;
	guilds: number;
	unavailable: number;
	exactMembers: number;
	approximateMembers: number;
	missingMembers: number;
	members: number;
	channels: number;
	users: number;
	voice: number;
	rss: number;
	heapUsed: number;
	samples: {
		unavailable: ShardGuildSample[];
		approximate: ShardGuildSample[];
		missing: ShardGuildSample[];
	};
}

// `data` is null when the shard did not answer (dead, respawning or stuck).
export interface ShardProbe {
	id: number;
	data: ShardData | null;
}

// Evaluated inside each shard from its source text: it must stay
// self-contained, nothing from this module is reachable there.
const collectShardData = (c: Client): ShardData => {
	const memory = process.memoryUsage();
	const data: ShardData = {
		pid: process.pid,
		status: c.ws.status,
		ping: c.ws.ping,
		uptime: c.uptime ?? 0,
		guilds: c.guilds.cache.size,
		unavailable: 0,
		exactMembers: 0,
		approximateMembers: 0,
		missingMembers: 0,
		members: 0,
		channels: c.channels.cache.size,
		users: c.users.cache.size,
		voice: 0,
		rss: memory.rss,
		heapUsed: memory.heapUsed,
		samples: { unavailable: [], approximate: [], missing: [] }
	};

	for (const guild of c.guilds.cache.values()) {
		const sample = { id: guild.id, name: guild.name };
		if (!guild.available) {
			data.unavailable++;
			if (data.samples.unavailable.length < 3) {
				data.samples.unavailable.push(sample);
			}
			continue;
		}
		if (guild.members.me?.voice.channelId) data.voice++;
		if (guild.memberCount) {
			data.exactMembers++;
			data.members += guild.memberCount;
		} else if (guild.approximateMemberCount) {
			data.approximateMembers++;
			data.members += guild.approximateMemberCount;
			if (data.samples.approximate.length < 3) {
				data.samples.approximate.push(sample);
			}
		} else {
			data.missingMembers++;
			if (data.samples.missing.length < 3) {
				data.samples.missing.push(sample);
			}
		}
	}

	return data;
};

const SHARD_PROBE_TIMEOUT_MS = 5_000;

function withTimeout<T>(task: Promise<T>, timeoutMs: number): Promise<T> {
	let timer: ReturnType<typeof setTimeout>;
	const expired = new Promise<never>((_, reject) => {
		timer = setTimeout(
			() => reject(new Error("Shard probe timed out")),
			timeoutMs
		);
	});
	return Promise.race([task, expired]).finally(() => clearTimeout(timer));
}

export async function collectShardProbes(
	client: Client,
	timeoutMs: number = SHARD_PROBE_TIMEOUT_MS
): Promise<ShardProbe[]> {
	const shard = client.shard;
	if (!shard) return [{ id: 0, data: collectShardData(client) }];

	// One eval per shard: a broadcast to all of them rejects as a whole as
	// soon as a single shard has no process.
	return Promise.all(
		Array.from({ length: shard.count }, async (_, id) => ({
			id,
			data: await withTimeout(
				shard.broadcastEval(collectShardData, { shard: id }),
				timeoutMs
			).catch(() => null)
		}))
	);
}
