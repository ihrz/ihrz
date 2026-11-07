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
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const MANAGER = fileURLToPath(
	new URL("./fixtures/shards/manager.ts", import.meta.url)
);
const SHARD = fileURLToPath(
	new URL("./fixtures/shards/shard.ts", import.meta.url)
);

const started: number[] = [];
const managers: ChildProcess[] = [];

function isRunning(pid: number): boolean {
	try {
		const stat = readFileSync(`/proc/${pid}/stat`, "utf8");

		// The state follows the parenthesised command name; a zombie is dead.
		return (
			stat.slice(stat.lastIndexOf(")") + 2, stat.lastIndexOf(")") + 3) !==
			"Z"
		);
	} catch {
		return false;
	}
}

// The shards of this test run, including any respawned one. The whole argument
// must match: a pattern search also finds any shell naming this path, and the
// cleanup below kills what it finds.
function runningFixtureShards(): number[] {
	const pids: number[] = [];

	for (const entry of readdirSync("/proc")) {
		if (!/^\d+$/.test(entry)) continue;

		try {
			const argv = readFileSync(`/proc/${entry}/cmdline`, "utf8").split(
				"\0"
			);

			if (argv[1] === SHARD && isRunning(Number(entry))) {
				pids.push(Number(entry));
			}
		} catch {
			// Gone in the meantime.
		}
	}

	return pids;
}

async function startManager(
	env: Record<string, string> = {}
): Promise<{ manager: ChildProcess; shards: number[] }> {
	const manager = spawn(process.execPath, [MANAGER], {
		env: { ...process.env, ...env },
		stdio: ["ignore", "pipe", "ignore"]
	});

	managers.push(manager);

	const line = await new Promise<string>((resolve) => {
		manager.stdout!.once("data", (data) => resolve(String(data)));
	});
	const shards = JSON.parse(line) as number[];

	started.push(...shards);

	// Lets the shards boot and install their signal handlers.
	await new Promise((resolve) => setTimeout(resolve, 500));

	return { manager, shards };
}

function waitForExit(manager: ChildProcess): Promise<number | null> {
	return new Promise((resolve) => {
		if (manager.exitCode !== null) resolve(manager.exitCode);
		else manager.once("exit", (code) => resolve(code));
	});
}

async function until(check: () => boolean, attempts = 100): Promise<void> {
	for (let attempt = 0; attempt < attempts && !check(); attempt++) {
		await new Promise((resolve) => setTimeout(resolve, 50));
	}

	expect(check()).toBe(true);
}

afterEach(() => {
	for (const manager of managers.splice(0)) manager.kill("SIGKILL");

	for (const pid of [...started.splice(0), ...runningFixtureShards()]) {
		try {
			process.kill(pid, "SIGKILL");
		} catch {
			// Already gone, the expected case.
		}
	}
});

test.each(["SIGTERM", "SIGINT", "SIGHUP"] as const)(
	"%s stops the manager and its shards, without respawning any",
	async (signal) => {
		const { manager, shards } = await startManager();

		expect(shards.every(isRunning)).toBe(true);

		manager.kill(signal);

		expect(await waitForExit(manager)).toBe(0);
		await until(() => !shards.some(isRunning));

		// A respawn would show up after the exit listener ran.
		await new Promise((resolve) => setTimeout(resolve, 300));
		expect(runningFixtureShards()).toEqual([]);
	},
	15_000
);

test("a shard ignoring the shutdown is killed after the grace period", async () => {
	const { manager, shards } = await startManager({
		SHARD_IGNORES_SIGTERM: "1",
		SHARD_GRACE_MS: "300"
	});

	manager.kill("SIGTERM");

	expect(await waitForExit(manager)).toBe(0);
	await until(() => !shards.some(isRunning));
}, 15_000);

test("a crash of the manager does not leave its shards behind", async () => {
	const { manager, shards } = await startManager({ MANAGER_CRASHES: "1" });

	await waitForExit(manager);

	// Stopped on the way out, not eventually: orphans can linger for seconds.
	await until(() => !shards.some(isRunning), 20);
}, 15_000);
