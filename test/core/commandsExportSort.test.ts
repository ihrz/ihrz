import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

import { sortedOptions } from "../../src/core/commandsSync.js";

// A command option as commands.json stores it (only what is walked here).
type Opt = { name: string; options?: Opt[] };

const names = (options: Opt[] | undefined) =>
	(options ?? []).map((o) => o.name);
const isSorted = (list: string[]) =>
	list.every((n, i) => i === 0 || list[i - 1]! <= n);

describe("commands.json export: options A→Z", () => {
	test("every level is sorted, nothing lost, input untouched", () => {
		const input = [
			{ name: "set", options: [{ name: "role" }, { name: "channel" }] },
			{ name: "add" },
			{ name: "Zeta" },
			{
				name: "manage",
				options: [
					{ name: "b", options: [{ name: "y" }, { name: "x" }] },
					{ name: "a" }
				]
			}
		];
		const out = sortedOptions(input) as Opt[];
		expect(names(out)).toEqual(["Zeta", "add", "manage", "set"]);
		expect(names(out[2].options)).toEqual(["a", "b"]);
		expect(names(out[2].options![1].options)).toEqual(["x", "y"]);
		expect(names(out[3].options)).toEqual(["channel", "role"]);
		expect(names(input)).toEqual(["set", "add", "Zeta", "manage"]);
		expect(sortedOptions(undefined)).toBeUndefined();
	});

	test("the committed src/files/commands.json is sorted", () => {
		const file = path.join(process.cwd(), "src", "files", "commands.json");
		const commands = JSON.parse(readFileSync(file, "utf8")) as Opt[];
		const unsorted: string[] = [];
		const walk = (list: Opt[] | undefined, at: string) => {
			if (!isSorted(names(list))) unsorted.push(at);
			for (const o of list ?? []) walk(o.options, `${at} ${o.name}`);
		};
		for (const c of commands) walk(c.options, c.name);
		expect(unsorted).toEqual([]);
	});
});
