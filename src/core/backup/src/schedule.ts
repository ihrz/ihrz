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

import type { Client, Guild } from "discord.js";

import { backupSchedulesTable } from "../../../Events/client/ready.js";
import { cardPayload, notice } from "../../modules/uiCard.js";
import type { DatabaseStructure } from "../../../../types/database_structure.js";
import {
	computeNextRun,
	MAX_BACKUPS_PER_USER,
	planAutoBackup
} from "./components";
import {
	BackupBusyError,
	createForUser,
	getUserBackups,
	isGuildBusy,
	isUserCreating,
	removeForUser
} from "./index";

type Schedule = DatabaseStructure.BackupSchedule;

const MAX_RUNS_PER_TICK = 3;

let ticking = false;

export async function getSchedule(guildId: string): Promise<Schedule | null> {
	return (
		((await backupSchedulesTable.get(guildId)) as Schedule | null) ?? null
	);
}

export async function saveSchedule(guildId: string, schedule: Schedule) {
	await backupSchedulesTable.set(guildId, schedule);
}

export async function removeSchedule(guildId: string) {
	await backupSchedulesTable.delete(guildId);
}

async function notifyOwner(client: Client, ownerId: string, content: string) {
	const user = await client.users.fetch(ownerId).catch(() => null);
	await user
		?.send(cardPayload(notice("warning", content)) as never)
		.catch(() => undefined);
}

async function runSchedule(client: Client, guild: Guild) {
	// The tick's list can be old by now: earlier guilds took their time.
	const schedule = await getSchedule(guild.id);
	const now = Date.now();
	if (!schedule || schedule.nextRunAt > now) return;

	if (schedule.ownerId !== guild.ownerId) {
		await removeSchedule(guild.id);
		return;
	}
	if (isGuildBusy(guild.id) || isUserCreating(schedule.ownerId)) return;

	// Moved first: a crash during the backup must not retry on every tick.
	const next: Schedule = {
		...schedule,
		nextRunAt: computeNextRun(now, schedule)
	};
	await saveSchedule(guild.id, next);

	// The owner may turn it off or change it while the backup runs.
	const record = async (result: Partial<Schedule>) => {
		const current = await getSchedule(guild.id);
		if (current?.nextRunAt !== next.nextRunAt) return false;
		await saveSchedule(guild.id, { ...current, ...result });
		return true;
	};

	const lang = await client.func.getLanguageData(guild.id);
	const failWith = async (error: "limit" | "failed", content: string) => {
		const stillOn = await record({ lastError: error });
		// Once per problem: a daily schedule must not DM every day.
		if (stillOn && schedule.lastError !== error) {
			await notifyOwner(client, schedule.ownerId, content);
		}
	};
	const failedText = lang.backup_schedule_dm_failed.replace(
		"${guildName}",
		guild.name
	);

	const plan = planAutoBackup(
		await getUserBackups(schedule.ownerId),
		guild.id
	);
	if (!plan.allowed) {
		await failWith(
			"limit",
			lang.backup_schedule_dm_limit
				.replace("${guildName}", guild.name)
				.replace("${max}", String(MAX_BACKUPS_PER_USER))
		);
		return;
	}

	try {
		// Old copies go only once the new one is saved and complete.
		const { data } = await createForUser(
			guild,
			schedule.ownerId,
			schedule.components,
			{ auto: true, bypassLimit: true }
		);
		if (data.incomplete?.length) {
			await removeForUser(schedule.ownerId, data.id);
			await failWith("failed", failedText);
			return;
		}
		// Turned off or changed meanwhile: its old copies are not ours to rotate.
		if (await record({ lastRunAt: now, lastError: null })) {
			for (const id of plan.remove) {
				await removeForUser(schedule.ownerId, id);
			}
		}
	} catch (error) {
		if (error instanceof BackupBusyError) {
			await record({ nextRunAt: schedule.nextRunAt });
			return;
		}
		logger.err(`Scheduled backup of ${guild.id} failed: ${error}`);
		await failWith("failed", failedText);
	}
}

/** Runs the due schedules of the guilds this shard holds. */
export async function runDueBackupSchedules(client: Client) {
	if (ticking) return;
	ticking = true;
	try {
		const all = await backupSchedulesTable.all();
		const now = Date.now();
		let runs = 0;
		for (const { id, value } of all) {
			if (runs >= MAX_RUNS_PER_TICK) break;
			const schedule = value as Schedule | null;
			if (!schedule || schedule.nextRunAt > now) continue;
			const guild = client.guilds.cache.get(id);
			if (!guild) continue;
			runs++;
			await runSchedule(client, guild);
		}
	} finally {
		ticking = false;
	}
}
