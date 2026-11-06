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

import type { ChildProcess } from "node:child_process";

import type { ShardingManager } from "discord.js";

import logger from "../logger.js";

// Shorter than the kill_timeout of pm2.config.cjs, which would otherwise
// SIGKILL the manager before it is done with its shards.
const SHARD_STOP_GRACE_MS = 10_000;

function hasExited(child: ChildProcess): boolean {
	return child.exitCode !== null || child.signalCode !== null;
}

async function stopShards(
	manager: ShardingManager,
	graceMs: number
): Promise<void> {
	const children: ChildProcess[] = [];

	for (const shard of manager.shards.values()) {
		if (!shard.process) continue;

		children.push(shard.process);

		// Not a plain signal: Shard.kill() also removes the exit listener
		// that would respawn the shard. It forgets the process, hence the list.
		shard.kill();
	}

	const exited = Promise.all(
		children.map(
			(child) =>
				new Promise<void>((resolve) => {
					if (hasExited(child)) resolve();
					else child.once("exit", () => resolve());
				})
		)
	);

	let timer: ReturnType<typeof setTimeout> | undefined;

	await Promise.race([
		exited,
		new Promise((resolve) => {
			timer = setTimeout(resolve, graceMs);
		})
	]);

	clearTimeout(timer);

	for (const child of children) {
		if (hasExited(child)) continue;

		logger.warn(
			`Shard process ${child.pid} ignored the shutdown, killing it`
		);
		child.kill("SIGKILL");
	}
}

// The shards are child processes that outlive the manager by default: each
// copy left behind keeps answering every command next to the new one.
export function installShardShutdown(
	manager: ShardingManager,
	graceMs: number = SHARD_STOP_GRACE_MS
): void {
	let stopping = false;

	const shutdown = (signal: NodeJS.Signals) => {
		if (stopping) return;

		stopping = true;
		logger.log(`${signal} received, stopping the shards`);

		stopShards(manager, graceMs)
			.catch((error) => {
				logger.err("Failed to stop the shards:", error);
			})
			.finally(() => process.exit(0));
	};

	for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
		process.on(signal, shutdown);
	}

	// Every other way out: a crash of the manager, or a shard the spawn loop
	// started during the shutdown. Only synchronous work is possible here.
	process.on("exit", () => {
		for (const shard of manager.shards.values()) {
			shard.process?.kill();
		}
	});
}
