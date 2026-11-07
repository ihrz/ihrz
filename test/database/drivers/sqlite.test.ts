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

import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Database } from "bun:sqlite";

import { Sqlite } from "../../../src/core/database/driver/sqlite.ts";

const dirs: string[] = [];

afterEach(() => {
	while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

test("sqlite driver opens the database in WAL mode with a busy timeout", async () => {
	const dir = mkdtempSync(join(tmpdir(), "ihrz-sqlite-"));
	dirs.push(dir);
	const filePath = join(dir, "db.sqlite");

	const driver = new Sqlite({ filePath });
	await driver.set("guild.value", 1);

	const probe = new Database(filePath);
	const mode = probe.query("PRAGMA journal_mode").get() as {
		journal_mode: string;
	};
	probe.close();
	expect(mode.journal_mode).toBe("wal");

	const own = (driver as any).db.query("PRAGMA busy_timeout").get() as {
		timeout: number;
	};
	expect(own.timeout).toBe(5000);
	expect(await driver.get("guild.value")).toBe(1);
});
