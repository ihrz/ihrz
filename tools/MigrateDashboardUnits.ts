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

/*
 * Repairs what the dashboard stored before it read units properly:
 * - GUILD.ANTISPAM.punishTime was typed in seconds and read in ms. /antispam
 *   only stores 2 minutes or more, so anything under a minute was seconds.
 * - ECONOMY cooldowns, same mistake. /economy stores at least 1000 (1 s), so
 *   under that it was seconds. From 1000 up it is ambiguous (86400 is 24 h in
 *   seconds, or 86 s from a command): listed, never changed.
 * - Any economy save wrote 0 for what was unset, which means no cooldown and no
 *   reward for the bot: those go back to unset.
 * - /setlogschannel stored `boost` and `ticket`, which nothing reads: moved to
 *   `boosts` and GUILD.TICKET.logs, unless those are already set.
 * It also lists what can't be guessed: a new account policy that is on with a
 * required age of 0 (a duration typed in words used to save that).
 *
 * Guilds are read one by one, listed from Discord with the bot token: the
 * whole table in one reply is more than the database sends.
 *
 * Usage: bun run tools/MigrateDashboardUnits.ts [--apply]   (dry run by default)
 */

import { REST, Routes, type APIGuild } from "discord.js";

import { initializeDatabase } from "../src/core/database/index.js";
import logger from "../src/core/logger.js";
import config from "../src/files/config.js";

const isDryRun = !process.argv.includes("--apply");
const COOLDOWNS = ["daily", "weekly", "monthly", "work", "rob"];
const AMOUNTS = ["daily", "weekly", "monthly"];

type Change = { path: string; from: unknown; to: unknown };

const positive = (v: unknown): v is number =>
	typeof v === "number" && Number.isFinite(v) && v > 0;

/** Every guild the bot is in, 200 per request (Discord's maximum). */
async function guildIds(): Promise<string[]> {
	const rest = new REST({ version: "10" }).setToken(config.discord.token);
	const ids: string[] = [];
	for (;;) {
		const query = new URLSearchParams({ limit: "200" });
		if (ids.length) query.set("after", ids[ids.length - 1]);
		const page = (await rest.get(Routes.userGuilds(), {
			query
		})) as APIGuild[];
		ids.push(...page.map((guild) => guild.id));
		if (page.length < 200) return ids;
	}
}

const run = async () => {
	const database = await initializeDatabase(config.database);
	const ids = await guildIds();
	logger.log(`${ids.length} guilds to check`);
	let changedGuilds = 0;
	let scanned = 0;

	for (const id of ids) {
		const value = await database.get(id);
		if (!value || typeof value !== "object") continue;
		scanned++;
		const row = { id, value };
		const doc = row.value as Record<string, any>;
		const changes: Change[] = [];
		const toCheck: string[] = [];

		const punishTime = doc.GUILD?.ANTISPAM?.punishTime;
		if (positive(punishTime) && punishTime < 60_000) {
			changes.push({
				path: "GUILD.ANTISPAM.punishTime",
				from: punishTime,
				to: punishTime * 1000
			});
		}

		const settings = doc.ECONOMY?.settings ?? {};
		for (const kind of COOLDOWNS) {
			const value = settings[kind]?.cooldown;
			const path = `ECONOMY.settings.${kind}.cooldown`;
			if (value === 0) changes.push({ path, from: 0, to: null });
			else if (positive(value) && value < 1000) {
				changes.push({ path, from: value, to: value * 1000 });
			} else if (positive(value) && value < 3_600_000) {
				toCheck.push(`${path}=${value}`);
			}
		}
		for (const kind of AMOUNTS) {
			if (settings[kind]?.amount === 0) {
				changes.push({
					path: `ECONOMY.settings.${kind}.amount`,
					from: 0,
					to: null
				});
			}
		}

		const logs = doc.GUILD?.SERVER_LOGS ?? {};
		for (const [key, target, current] of [
			["boost", "GUILD.SERVER_LOGS.boosts", logs.boosts],
			["ticket", "GUILD.TICKET.logs", doc.GUILD?.TICKET?.logs]
		] as const) {
			if (!logs[key]) continue;
			if (!current)
				changes.push({ path: target, from: undefined, to: logs[key] });
			changes.push({
				path: `GUILD.SERVER_LOGS.${key}`,
				from: logs[key],
				to: null
			});
		}

		const blockNew = doc.GUILD?.BLOCK_NEW_ACCOUNT;
		if (blockNew?.state && !blockNew.req) {
			toCheck.push("GUILD.BLOCK_NEW_ACCOUNT: on with no required age");
		}

		for (const item of toCheck) logger.legacy(`[CHECK] ${row.id} ${item}`);
		if (!changes.length) continue;
		changedGuilds++;
		for (const { path, from, to } of changes) {
			logger.legacy(
				`[${isDryRun ? "DRY-RUN" : "APPLY"}] ${row.id} ${path}: ${from} -> ${to ?? "unset"}`
			);
			if (isDryRun) continue;
			if (to === null) await database.delete(`${row.id}.${path}`);
			else await database.set(`${row.id}.${path}`, to);
		}
	}

	logger.log(`Finished. scanned=${scanned} guildsChanged=${changedGuilds}`);
	if (isDryRun) {
		logger.warn(
			"No database changes were written. Re-run with --apply to persist changes."
		);
	}
};

run()
	.then(() => process.exit(0))
	.catch((error) => {
		logger.err(error);
		process.exit(1);
	});
