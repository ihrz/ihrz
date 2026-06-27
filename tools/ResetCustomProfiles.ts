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

import { REST, Routes, ShardingManager } from "discord.js";
import { readFile } from "fs/promises";
import path from "path";
import config from "../src/files/config.js";
import logger from "../src/core/logger.js";

const token = process.env.BOT_TOKEN || config.discord.token;
const GUILDS_PER_SHARD = 700;

interface GatewayBotInfo {
	url: string;
	shards: number;
	session_start_limit: {
		total: number;
		remaining: number;
		reset_after: number;
		max_concurrency: number;
	};
}

interface CustomEnabledGuild {
	guildId: string;
	guildName: string;
	lastUsedAt: number;
	uses: number;
}

function getShardId(guildId: string, totalShards: number): number {
	return Number((BigInt(guildId) >> 22n) % BigInt(totalShards));
}

async function getOptimalShardCount(): Promise<number> {
	const rest = new REST({ version: "10" }).setToken(token);
	const gateway = (await rest.get(Routes.gatewayBot())) as GatewayBotInfo;

	const discordRecommended = gateway.shards;
	const shardMultiplier = Math.ceil(1000 / GUILDS_PER_SHARD);
	const final = Math.max(
		discordRecommended,
		discordRecommended * shardMultiplier
	);

	logger.debug(`Gateway recommended shards: ${discordRecommended}`);
	logger.debug(
		`Gateway max concurrency: ${gateway.session_start_limit.max_concurrency}`
	);
	logger.debug(`Computed total shards for reset script: ${final}`);

	return final;
}

async function main() {
	const inputPath = path.join(
		process.cwd(),
		"src",
		"files",
		"custom-enabled-guilds.json"
	);
	const shouldApply = process.argv.includes("--apply");
	const mode = shouldApply ? "apply" : "dry-run";

	logger.log(`ResetCustomProfiles started in ${mode} mode.`);
	logger.debug(`Reading input file: ${inputPath}`);

	const raw = await readFile(inputPath, "utf-8");
	const guilds = JSON.parse(raw) as CustomEnabledGuild[];

	logger.debug(`Loaded ${guilds.length} guild entries from JSON.`);
	if (!guilds.length) {
		throw new Error("custom-enabled-guilds.json is empty");
	}

	const totalShards = await getOptimalShardCount();
	const perShard = new Map<number, CustomEnabledGuild[]>();

	for (const entry of guilds) {
		const shardId = getShardId(entry.guildId, totalShards);
		logger.debug(`Guild ${entry.guildId} mapped to shard ${shardId}`);

		if (!perShard.has(shardId)) {
			perShard.set(shardId, []);
		}
		perShard.get(shardId)!.push(entry);
	}

	logger.log(`Spawning ${totalShards} shards for reset script.`);
	const workerShards = [...perShard.keys()].sort((a, b) => a - b);
	logger.debug(`Worker shards to spawn: ${workerShards.join(", ")}`);

	const manager = new ShardingManager(
		"./tools/ResetCustomProfilesShardWorker.ts",
		{
			totalShards,
			token,
			respawn: false,
			shardList: workerShards,
			shardArgs: [shouldApply ? "--apply" : "--dry-run"]
		}
	);

	manager.on("shardCreate", (shard) => {
		logger.log(`Reset worker shard #${shard.id} spawning...`);
		shard.on("ready", () =>
			logger.log(`Reset worker shard #${shard.id} ready`)
		);
		shard.on("disconnect", () =>
			logger.warn(`Reset worker shard #${shard.id} disconnected`)
		);
		shard.on("death", () => {
			logger.log(`Reset worker shard #${shard.id} exited`);
		});
		shard.on("error", (error) =>
			logger.err(
				`Reset worker shard #${shard.id} error: ${error.message}`
			)
		);
	});

	const workersWithGuilds = workerShards.map((shardId) => ({
		shardId,
		guilds: perShard.get(shardId) || []
	}));

	const shards = await manager.spawn({
		amount: workerShards.length,
		delay: 5500,
		timeout: 30_000
	});

	logger.debug(`Spawned ${shards.size} reset worker shards.`);
	for (const worker of workersWithGuilds) {
		logger.debug(
			`Shard ${worker.shardId} assigned ${(perShard.get(worker.shardId) || []).length} guilds.`
		);
	}
}

main().catch((error) => {
	logger.err(error);
	process.exit(1);
});
