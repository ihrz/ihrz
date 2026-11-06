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
 * It also lists what can't be guessed: a new account policy that is on with a
 * required age of 0 (a duration typed in words used to save that).
 *
 * Usage: bun run tools/MigrateDashboardUnits.ts [--apply]   (dry run by default)
 */

import { initializeDatabase } from "../src/core/database/index.js";
import logger from "../src/core/logger.js";
import config from "../src/files/config.js";

const isDryRun = !process.argv.includes("--apply");
const COOLDOWNS = ["daily", "weekly", "monthly", "work", "rob"];
const AMOUNTS = ["daily", "weekly", "monthly"];

type Change = { path: string; from: unknown; to: number | null };

const positive = (v: unknown): v is number =>
	typeof v === "number" && Number.isFinite(v) && v > 0;

const run = async () => {
	const database = await initializeDatabase(config.database);
	const rows = await database.all();
	let changedGuilds = 0;

	for (const row of rows) {
		if (!/^\d{5,25}$/.test(row.id) || !row.value) continue;
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

	logger.log(
		`Finished. scanned=${rows.length} guildsChanged=${changedGuilds}`
	);
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
