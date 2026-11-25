import { afterAll, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
	H247SessionMap,
	h247Shards,
	parseHint,
	prioritizedShardList,
	readH247Hints,
	readOwnH247Hint,
	shardOfGuild,
	writeH247Hint
} from "../../src/core/modules/h247ShardHint.js";

const dirs: string[] = [];
const tempDir = async () => {
	const dir = await mkdtemp(path.join(tmpdir(), "h247-hint-"));
	dirs.push(dir);
	return dir;
};
afterAll(async () => {
	for (const dir of dirs) await rm(dir, { recursive: true, force: true });
});

describe("h247ShardHint", () => {
	test("guild → shard is Discord's formula", () => {
		// (999449972615413861 >> 22) % 18 = 16, as measured with TOTAL_SHARDS=18.
		expect(shardOfGuild("999449972615413861", 18)).toBe(16);
		expect(shardOfGuild("999449972615413861", 2)).toBe(0);
		expect(shardOfGuild("999449972615413861", 1)).toBe(0);
	});

	test("the shards of H24/7 servers come first, every shard exactly once", () => {
		const list = prioritizedShardList(18, ["999449972615413861"]);
		expect(list[0]).toBe(16);
		expect([...list].sort((a, b) => a - b)).toEqual(
			Array.from({ length: 18 }, (_, i) => i)
		);
		expect(prioritizedShardList(3, [])).toEqual([0, 1, 2]);
		expect(
			h247Shards(18, ["999449972615413861", "999449972615413861"])
		).toEqual([16]);
	});

	test("a broken hint file means no hint, never a crash", () => {
		expect(parseHint("")).toEqual([]);
		expect(parseHint("{")).toEqual([]);
		expect(parseHint('{"a":1}')).toEqual([]);
		expect(parseHint('["999449972615413861", 3, "x", "../1"]')).toEqual([
			"999449972615413861"
		]);
	});

	test("written per shard, read back by the manager and by the shard", async () => {
		const dir = await tempDir();
		await writeH247Hint(16, ["999449972615413861"], dir);
		await writeH247Hint(3, ["1053818045073739817"], dir);
		await writeFile(path.join(dir, "notes.txt"), "ignored");
		expect((await readH247Hints(dir)).sort()).toEqual([
			"1053818045073739817",
			"999449972615413861"
		]);
		expect(await readOwnH247Hint(16, dir)).toEqual(["999449972615413861"]);
		expect(await readOwnH247Hint(7, dir)).toEqual([]);
		expect(await readH247Hints(path.join(dir, "missing"))).toEqual([]);
	});

	test("the session map rewrites the hint when its guilds change", async () => {
		const dir = await tempDir();
		const writes: string[][] = [];
		const map = new H247SessionMap(async (ids) => {
			writes.push(ids);
			await writeH247Hint(0, ids, dir);
		});
		map.set("999449972615413861", "1509600844717232138");
		map.set("999449972615413861", "1509600846126645408"); // same guild, no new write
		await map.flush();
		expect(
			JSON.parse(await readFile(path.join(dir, "0.json"), "utf8"))
		).toEqual(["999449972615413861"]);
		expect(map.get("999449972615413861")).toBe("1509600846126645408");
		map.delete("999449972615413861");
		await map.flush();
		expect(await readOwnH247Hint(0, dir)).toEqual([]);
		expect(writes.length).toBe(2);
	});
});
