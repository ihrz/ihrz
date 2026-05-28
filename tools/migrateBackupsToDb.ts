import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { initializeDatabase } from "../src/core/database/index.js";
import config from "../src/files/config.js";
import type { BackupData } from "../src/core/backup/src/types/index.js";

const sourceDir = path.join(process.cwd(), "src", "files", "backups");

const run = async () => {
	const { x, y, og } = await initializeDatabase(config.database);
	const database = y ?? og ?? x;
	const backupsTable = await database.table("backups");

	const files = await readdir(sourceDir);
	const jsonFiles = files.filter((file) => file.endsWith(".json"));

	let migrated = 0;

	for (const file of jsonFiles) {
		const backupId = file.replace(/\.json$/, "");
		const raw = await readFile(path.join(sourceDir, file), "utf-8");
		const data = JSON.parse(raw) as BackupData;

		await backupsTable.set(backupId, data);
		migrated++;
	}

	console.log(`Migrated ${migrated} backups to database table "backups".`);
};

run().catch((error) => {
	console.error(error);
	process.exit(1);
});
