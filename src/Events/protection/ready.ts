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

import { Client, GuildBasedChannel, CategoryChannel, ChannelType, PermissionOverwrites, GuildChannel, PermissionsBitField, AuditLogEvent, Guild, GuildAuditLogsEntry } from 'discord.js';

export type BackupChannel = {
	id: string;
	name: string;
	type: ChannelType;
	position: number;
	permissions: PermissionOverwrites[];
	parent: string | null;
};

export type BackupRole = {
	id: string;
	members: string[]
}

export type BackupCategory = {
	id: string;
	name: string;
	position: number;
	channels: BackupChannel[];
};

export type GuildBackup = {
	categories: BackupCategory[];
	channels: BackupChannel[];
	roles: BackupRole[];
};

export const protectionCache = {
	data: new Map<string, GuildBackup>(),
	isRaiding: new Map<string, boolean>(),
	timeout: new Map<string, number>()
}

async function backupGuildStructure(client: Client) {
	for (const guild of client.guilds.cache.values()) {
		if (protectionCache.isRaiding.get(guild.id)) return;
		const backup: GuildBackup = {
			categories: [],
			channels: [],
			roles: []
		};

		guild.channels.cache.forEach((channel: GuildBasedChannel) => {
			if (channel instanceof CategoryChannel) {
				const categoryData: BackupCategory = {
					id: channel.id,
					name: channel.name,
					position: channel.position,
					channels: channel.children.cache.map(child => ({
						id: child.id,
						name: child.name,
						type: child.type,
						position: child.rawPosition,
						permissions: Array.from(child.permissionOverwrites.cache.values()),
						parent: channel.id
					}))
				};
				backup.categories.push(categoryData);
			} else if (channel instanceof GuildChannel && (channel.type === ChannelType.GuildText || channel.isTextBased())) {
				const channelData: BackupChannel = {
					id: channel.id,
					name: channel.name,
					type: channel.type,
					position: channel.rawPosition,
					permissions: Array.from(channel.permissionOverwrites.cache.values()),
					parent: channel.parentId
				};
				backup.channels.push(channelData);
			}
		});

		guild.roles.cache.forEach((role) => {
			const roleData: BackupRole = {
				id: role.id,
				members: role.members.toJSON().map(x => x.id)
			}
			backup.roles.push(roleData)
		})

		protectionCache.data.set(guild.id, backup);
	}
}

export const handledAuditLogEntries = new Set<string>();
export const handledAuditLogEntrie_logs = new Set<string>();

export interface GetGuildLogPayload {
	guild: Guild;
	target: string;
	type: "PROTECTION" | "LOGS" | "NONE";
	actionType: AuditLogEvent
}

const LOG_SETS = {
	PROTECTION: handledAuditLogEntries,
	LOGS: handledAuditLogEntrie_logs,
	NONE: null
} as const;

const AUDIT_LOG_WINDOW_MS = 20_000;
const AUDIT_LOG_FETCH_LIMIT = 40;

export async function getLogs(
	payload: GetGuildLogPayload,
): Promise<GuildAuditLogsEntry | undefined> {
	const { guild, target, type } = payload;

	// Fetch recent audit logs
	const fetchedLogs = await guild.fetchAuditLogs({
		type: payload.actionType,
		limit: AUDIT_LOG_FETCH_LIMIT
	});

	// Find relevant log entry
	const relevantLog = fetchedLogs.entries.find(entry => {
		const isTargetMatch = entry.targetId === target;
		const isNotBot = entry.executorId !== client.user?.id;
		const hasExecutor = Boolean(entry.executorId);
		const isRecent = entry.createdTimestamp > Date.now() - AUDIT_LOG_WINDOW_MS;

		return isTargetMatch && isNotBot && hasExecutor && isRecent;
	});

	// Return early if no log found or executor is the bot
	if (!relevantLog || relevantLog.executor?.id === client.user?.id) {
		return undefined;
	}

	// Check if already handled based on type
	const logSet = LOG_SETS[type];
	if (logSet?.has(relevantLog.id)) {
		return undefined;
	}

	// Mark as handled
	logSet?.add(relevantLog.id);

	return relevantLog;
}

export const event = {
	name: 'clientReady',
	run: async (client: Client) => {
		await backupGuildStructure(client);
		setInterval(() => backupGuildStructure(client), 60 * 1000);
	}
};