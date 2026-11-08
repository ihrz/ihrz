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

import type {
	BackupData,
	BackupInfos,
	CreateOptions,
	LoadOptions
} from "./types/";
import type { Guild } from "discord.js";
import { SnowflakeUtil } from "discord.js";

import * as createMaster from "./create";
import * as loadMaster from "./load";
import * as utilMaster from "./util";
import {
	componentsOf,
	DEFAULT_BACKUP_COMPONENTS,
	MAX_BACKUPS_PER_USER,
	MAX_MESSAGES_PER_CHANNEL,
	normalizeComponents,
	type BackupComponent
} from "./components";
import { backupsTable, metasTable } from "../../../Events/client/ready.js";
import type { DatabaseStructure } from "../../../../types/database_structure.js";

export * from "./components";
export {
	getSchedule,
	removeSchedule,
	runDueBackupSchedules,
	saveSchedule
} from "./schedule";

export class BackupLimitError extends Error {
	constructor() {
		super("Backup limit reached");
		this.name = "BackupLimitError";
	}
}

export class BackupBusyError extends Error {
	constructor() {
		super("A backup operation is already running");
		this.name = "BackupBusyError";
	}
}

const creatingUsers = new Set<string>();
const loadingGuilds = new Set<string>();
const capturingGuilds = new Set<string>();

export const isGuildBusy = (guildId: string) =>
	loadingGuilds.has(guildId) || capturingGuilds.has(guildId);

export const isUserCreating = (userId: string) => creatingUsers.has(userId);

const getBackupData = async (backupID: string): Promise<BackupData> => {
	const backupData = await backupsTable.get(backupID);
	if (!backupData) throw new Error("No backup found");
	return backupData as BackupData;
};

export const fetchBackup = async (backupID: string): Promise<BackupInfos> => {
	const data = await getBackupData(backupID);
	const size = Buffer.byteLength(JSON.stringify(data), "utf-8");
	return { data, id: backupID, size: Number((size / 1024).toFixed(2)) };
};

/**
 * Captures the selected parts of a guild. A part that cannot be read stays
 * empty; only a failed save rejects.
 */
export const create = async (
	guild: Guild,
	options: CreateOptions = {}
): Promise<BackupData> => {
	const components = normalizeComponents(
		options.components ?? DEFAULT_BACKUP_COMPONENTS
	);
	const has = (c: BackupComponent) => components.includes(c);
	const resolved: CreateOptions = {
		saveImages: true,
		...options,
		components,
		maxMessagesPerChannel: has("messages")
			? (options.maxMessagesPerChannel ?? MAX_MESSAGES_PER_CHANNEL)
			: 0
	};

	const backupData: BackupData = {
		version: 2,
		components,
		name: guild.name || "Unknown Server",
		verificationLevel: guild.verificationLevel,
		explicitContentFilter: guild.explicitContentFilter,
		defaultMessageNotifications: guild.defaultMessageNotifications,
		afk: null,
		widget: { enabled: false, channel: null },
		channels: { categories: [], others: [] },
		roles: [],
		bans: [],
		emojis: [],
		stickers: [],
		automod: [],
		events: [],
		members: [],
		createdTimestamp: Date.now(),
		guildID: guild.id,
		id: options.backupID ?? SnowflakeUtil.generate().toString()
	};

	// A part that could not be read must not be listed as saved: restoring
	// it would wipe the live data and put nothing back.
	const failed = new Set<BackupComponent>();
	resolved.onPartial = (component) => failed.add(component);
	const capture = async <T>(
		parts: BackupComponent[],
		run: () => Promise<T>,
		fallback: T
	): Promise<T> => {
		try {
			return await run();
		} catch (error) {
			logger.err(`Backup: ${parts.join("+")} failed: ${error}`);
			for (const part of parts) failed.add(part);
			return fallback;
		}
	};

	if (has("settings")) {
		Object.assign(
			backupData,
			await capture(
				["settings"],
				() => createMaster.getSettings(guild, resolved),
				{}
			)
		);
	}
	if (has("members")) {
		backupData.members = await capture(
			["members"],
			() => createMaster.getMembers(guild),
			[]
		);
	}
	if (has("bans")) {
		backupData.bans = await capture(
			["bans"],
			() => createMaster.getBans(guild),
			[]
		);
	}
	if (has("roles")) {
		backupData.roles = await capture(
			["roles"],
			() => createMaster.getRoles(guild),
			[]
		);
	}
	if (has("emojis")) {
		backupData.emojis = await capture(
			["emojis"],
			() => createMaster.getEmojis(guild, resolved),
			[]
		);
	}
	if (has("stickers")) {
		backupData.stickers = await capture(
			["stickers"],
			() => createMaster.getStickers(guild),
			[]
		);
	}
	if (has("automod")) {
		backupData.automod = await capture(
			["automod"],
			() => createMaster.getAutomod(guild),
			[]
		);
	}
	if (has("events")) {
		backupData.events = await capture(
			["events"],
			() => createMaster.getEvents(guild),
			[]
		);
	}
	if (has("channels") || has("permissions")) {
		backupData.channels = await capture(
			["channels", "permissions", "messages"],
			() => createMaster.getChannels(guild, resolved),
			backupData.channels
		);
	}

	backupData.components = components.filter((c) => !failed.has(c));
	backupData.incomplete = components.filter((c) => failed.has(c));

	await backupsTable.set(backupData.id, backupData);
	return backupData;
};

export type BackupIndex = DatabaseStructure.DbBackupsUserObject;

export async function getUserBackups(userId: string): Promise<BackupIndex> {
	return (
		((await metasTable.get(`BACKUPS.${userId}`)) as BackupIndex | null) ??
		{}
	);
}

export function backupStats(data: BackupData) {
	return {
		categoryCount: data.channels.categories.length,
		channelCount:
			data.channels.others.length +
			data.channels.categories.reduce((n, c) => n + c.children.length, 0)
	};
}

/** Saves the backup and files it under the user. Enforces the per-user limit. */
export async function createForUser(
	guild: Guild,
	userId: string,
	components: readonly string[],
	options: { auto?: boolean; bypassLimit?: boolean } = {}
): Promise<{ data: BackupData; count: number }> {
	if (
		creatingUsers.has(userId) ||
		loadingGuilds.has(guild.id) ||
		capturingGuilds.has(guild.id)
	) {
		throw new BackupBusyError();
	}
	creatingUsers.add(userId);
	capturingGuilds.add(guild.id);
	try {
		const before = Object.keys(await getUserBackups(userId)).length;
		if (!options.bypassLimit && before >= MAX_BACKUPS_PER_USER) {
			throw new BackupLimitError();
		}

		const data = await create(guild, {
			components: normalizeComponents(components)
		});
		if (!data.components?.length) {
			await remove(data.id);
			throw new Error("Nothing could be read");
		}
		await metasTable.set(`BACKUPS.${userId}.${data.id}`, {
			guildName: data.name,
			guildId: guild.id,
			createdTimestamp: data.createdTimestamp,
			components: data.components ?? [],
			auto: options.auto === true,
			...backupStats(data)
		});
		return { data, count: before + 1 };
	} finally {
		creatingUsers.delete(userId);
		capturingGuilds.delete(guild.id);
	}
}

/** Restores the selected parts, in dependency order. */
export const load = async (
	backup: string | BackupData,
	guild: Guild,
	options: LoadOptions = {}
) => {
	if (isGuildBusy(guild.id)) throw new BackupBusyError();
	loadingGuilds.add(guild.id);
	try {
		const backupData =
			typeof backup === "string" ? await getBackupData(backup) : backup;
		const stored = componentsOf(backupData);
		const components = options.components
			? normalizeComponents(options.components).filter((c) =>
					stored.includes(c)
				)
			: stored;

		if (options.clearGuildBeforeRestore !== false) {
			await utilMaster.clearGuild(guild, components, backupData);
		}
		return await loadMaster.restore(guild, backupData, components, options);
	} finally {
		loadingGuilds.delete(guild.id);
	}
};

export const remove = async (backupID: string) => {
	await backupsTable.delete(backupID);
};

/** Deletes the backup and its entry in the user's list. */
export async function removeForUser(userId: string, backupID: string) {
	await remove(backupID);
	await metasTable.delete(`BACKUPS.${userId}.${backupID}`);
}

export const list = async () => {
	const entries = await backupsTable.all();
	return entries.map((entry) => entry.id);
};
