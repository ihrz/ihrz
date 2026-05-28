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

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { initializeDatabase } from "../src/core/database/index.js";
import config from "../src/files/config.js";
import type { Giveaway } from "../types/giveaways.js";

const sourceDir = path.join(process.cwd(), "src", "files", "giveaways");

const run = async () => {
	const { x, y, og } = await initializeDatabase(config.database);
	const database = y ?? og ?? x;
	const giveawaysTable = await database.table("giveaways");

	const files = await readdir(sourceDir);
	const jsonFiles = files.filter((file) => file.endsWith(".json"));

	let migrated = 0;

	for (const file of jsonFiles) {
		const giveawayId = file.replace(/\.json$/, "");
		const raw = await readFile(path.join(sourceDir, file), "utf-8");
		const data = JSON.parse(raw) as Giveaway;

		await giveawaysTable.set(giveawayId, data);
		migrated++;
	}

	console.log(`Migrated ${migrated} giveaways to database table "giveaways".`);
};

run().catch((error) => {
	console.error(error);
	process.exit(1);
});
