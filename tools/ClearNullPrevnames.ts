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

import { initializeDatabase } from "../src/core/database/index.js";
import logger from "../src/core/logger.js";
import config from "../src/files/config.js";

type PrevnameEntry = string | null;
type PrevnameValue = PrevnameEntry[] | null | undefined;

const isDryRun = !process.argv.includes("--apply");

const normalizePrevnames = (value: PrevnameValue): string[] => {
	if (!Array.isArray(value)) return [];

	return value.filter((entry): entry is string => {
		if (typeof entry !== "string") return false;

		// Format: "<t:TIMESTAMP:d> - NAME"
		const name = entry.split(" - ").slice(1).join(" - ").trim();
		return name.toLowerCase() !== "null" && name.length > 0;
	});
};

const run = async () => {
	const { x, y, og } = await initializeDatabase(config.database);
	const database = y ?? og ?? x;
	const prevnamesTable = await database.table("prevnames");
	const rows = await prevnamesTable.all();

	logger.log(
		`Starting prevnames cleanup in ${isDryRun ? "dry-run" : "apply"} mode.`
	);
	logger.log(
		`Loaded ${rows.length} prevnames records from official bot database.`
	);

	let scanned = 0;
	let changed = 0;
	let removedEntries = 0;
	let deletedRows = 0;

	for (const row of rows) {
		scanned++;

		const currentValue = row.value as PrevnameValue;
		const currentEntries = Array.isArray(currentValue) ? currentValue : [];
		const cleanedEntries = normalizePrevnames(currentValue);
		const removedForRow = currentEntries.length - cleanedEntries.length;

		if (removedForRow <= 0) {
			continue;
		}

		changed++;
		removedEntries += removedForRow;

		logger.legacy(
			`[${isDryRun ? "DRY-RUN" : "APPLY"}] ${row.id} | before=${currentEntries.length} | after=${cleanedEntries.length} | removed=${removedForRow}`
		);

		for (const [index, entry] of currentEntries.entries()) {
			if (
				typeof entry !== "string" ||
				entry.trim().toLowerCase() === "null"
			) {
				logger.legacy(
					`  - removed entry #${index + 1}: ${JSON.stringify(entry)}`
				);
			}
		}

		if (isDryRun) {
			continue;
		}

		if (cleanedEntries.length === 0) {
			await prevnamesTable.delete(row.id);
			deletedRows++;
			logger.legacy(
				`  -> deleted row ${row.id} because no valid prevnames remain.`
			);
			continue;
		}

		await prevnamesTable.set(row.id, cleanedEntries);
		logger.legacy(`  -> updated row ${row.id}.`);
	}

	logger.log(
		`Cleanup finished. scanned=${scanned} changed=${changed} removedEntries=${removedEntries} deletedRows=${deletedRows} mode=${isDryRun ? "dry-run" : "apply"}`
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
