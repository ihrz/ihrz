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

import { spawn, type ChildProcess } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	realpathSync,
	rmSync,
	writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// A plain CommonJS helper of the pm2 launcher, which runs on Node before any
// dependency is installed: it has no type declarations.
const {
	findBotProcesses,
	isBotProcess,
	killPhantoms
} = require("../scripts/killPhantoms.cjs");

const ROOT = "/srv/bot";

const children: ChildProcess[] = [];
const dirs: string[] = [];

afterEach(() => {
	for (const child of children.splice(0)) child.kill("SIGKILL");
	for (const dir of dirs.splice(0))
		rmSync(dir, { recursive: true, force: true });
});

function makeCheckout(script: string): string {
	const root = realpathSync(mkdtempSync(join(tmpdir(), "ihorizon-phantom-")));

	dirs.push(root);
	mkdirSync(join(root, "src/core"), { recursive: true });
	writeFileSync(join(root, "src/index.ts"), script);
	writeFileSync(join(root, "src/core/bot.ts"), script);

	return root;
}

async function start(root: string, args: string[]): Promise<ChildProcess> {
	const child = spawn(process.execPath, args, {
		cwd: root,
		stdio: ["ignore", "pipe", "ignore"]
	});

	children.push(child);

	// Waits for the script's first line: its handlers are installed by then.
	await new Promise((resolve) => child.stdout!.once("data", resolve));

	return child;
}

const SLEEPER = `console.log("up"); setInterval(() => {}, 1000);`;
const SIGTERM_IGNORER = `process.on("SIGTERM", () => {}); ${SLEEPER}`;

test.each([
	[["bun", "src/index.ts"]],
	[["bun", "./src/index.ts"]],
	[["/srv/bot/.bun/bin/bun", "src/index.ts"]],
	[["bun", "run", "src/core/bot.ts"]],
	[["bun", "/srv/bot/src/core/bot.ts"]],
	[["bun", "--smol", "src/index.ts"]],
	[["bun", "./dist/shard/bot.js"]]
])("%j is a bot process", (argv) => {
	expect(isBotProcess(argv, ROOT, ROOT)).toBe(true);
});

test.each([
	[["vim", "src/index.ts"], ROOT],
	[["node", "src/index.ts"], ROOT],
	[["bun", "test", "src/index.ts"], ROOT],
	[["bun", "run", "dev"], ROOT],
	[["bun", "src/other.ts"], ROOT],
	[["bun"], ROOT],
	[["bun", "/srv/other/src/core/bot.ts"], ROOT]
])("%j is not a bot process", (argv, cwd) => {
	expect(isBotProcess(argv, cwd, ROOT)).toBe(false);
});

test("stops the bot and its shards, and leaves another checkout alone", async () => {
	const root = makeCheckout(SLEEPER);
	const other = makeCheckout(SLEEPER);

	const manager = await start(root, ["src/index.ts"]);
	const shard = await start(root, [join(root, "src/core/bot.ts")]);
	const neighbour = await start(other, ["src/index.ts"]);

	const stopped = killPhantoms(root, { termWaitMs: 2000 });

	expect(stopped.sort()).toEqual([manager.pid!, shard.pid!].sort());
	expect(findBotProcesses(root)).toEqual([]);
	expect(findBotProcesses(other)).toEqual([neighbour.pid!]);
	expect(neighbour.exitCode).toBeNull();
	expect(existsSync(`/proc/${neighbour.pid}`)).toBe(true);
});

test("a process ignoring SIGTERM ends up killed", async () => {
	const root = makeCheckout(SIGTERM_IGNORER);
	const stubborn = await start(root, ["src/core/bot.ts"]);

	expect(killPhantoms(root, { termWaitMs: 300 })).toEqual([stubborn.pid!]);

	await new Promise((resolve) => {
		if (stubborn.signalCode) resolve(null);
		else stubborn.once("exit", resolve);
	});

	expect(stubborn.signalCode).toBe("SIGKILL");
});

test("nothing to stop", () => {
	expect(killPhantoms(makeCheckout(SLEEPER))).toEqual([]);
});
