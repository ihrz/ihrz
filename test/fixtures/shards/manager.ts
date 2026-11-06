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

// A real ShardingManager with the shutdown hooks of src/index.ts.
import { fileURLToPath } from "node:url";

import { ShardingManager } from "discord.js";

import { installShardShutdown } from "../../../src/core/modules/shardShutdown.ts";

const manager = new ShardingManager(
	fileURLToPath(new URL("./shard.ts", import.meta.url)),
	{ totalShards: 2, token: "fixture", respawn: true }
);

installShardShutdown(manager, Number(process.env.SHARD_GRACE_MS ?? 2_000));

await manager.spawn({ amount: 2, delay: 0, timeout: -1 });

const pids = [...manager.shards.values()].map((shard) => shard.process?.pid);

process.stdout.write(`${JSON.stringify(pids)}\n`);

if (process.env.MANAGER_CRASHES === "1") {
	setTimeout(() => {
		throw new Error("manager crash");
	}, 200);
}

setInterval(() => {}, 1_000);
