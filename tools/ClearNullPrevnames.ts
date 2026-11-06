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
 * Converts the whole `prevnames` table to typed entries, dropping nulls and
 * duplicates (the bot does the same, one history at a time, when it loads one).
 *
 * Usage: bun run tools/ClearNullPrevnames.ts [--apply]   (dry run by default)
 */

import { loadHistory } from "../src/core/modules/prevnamesHistory.js";
import { initializeDatabase } from "../src/core/database/index.js";
import logger from "../src/core/logger.js";
import config from "../src/files/config.js";

const isDryRun = !process.argv.includes("--apply");

const run = async () => {
	const database = await initializeDatabase(config.database);
	const prevnamesTable = await database.table("prevnames");
	const rows = await prevnamesTable.all();

	logger.log(
		`Starting prevnames conversion in ${isDryRun ? "dry-run" : "apply"} mode.`
	);
	logger.log(
		`Loaded ${rows.length} prevnames records from official bot database.`
	);

	let changed = 0;
	let removedEntries = 0;
	let deletedRows = 0;

	for (const row of rows) {
		const history = loadHistory(row.value);
		if (JSON.stringify(row.value) === JSON.stringify(history)) continue;

		const before = Array.isArray(row.value) ? row.value.length : 0;
		changed++;
		removedEntries += before - history.length;

		logger.legacy(
			`[${isDryRun ? "DRY-RUN" : "APPLY"}] ${row.id} | before=${before} | after=${history.length}`
		);

		if (isDryRun) continue;

		if (history.length === 0) {
			await prevnamesTable.delete(row.id);
			deletedRows++;
			continue;
		}

		await prevnamesTable.set(row.id, history);
	}

	logger.log(
		`Conversion finished. scanned=${rows.length} changed=${changed} removedEntries=${removedEntries} deletedRows=${deletedRows}`
	);

	if (isDryRun) {
		logger.warn(
			"No database changes were written. Re-run with --apply to persist changes."
		);
	}
};

run().catch((error) => {
	logger.err(error);
	process.exit(1);
});
