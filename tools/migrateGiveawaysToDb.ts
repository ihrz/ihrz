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
