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

import "./core/functions/colors.js";

import config from "./files/config.js";
import logger from "./core/logger.js";

import { ShardingManager, REST, Routes } from "discord.js";

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

async function getOptimalShardCount(): Promise<number> {
	const rest = new REST({ version: "10" }).setToken(token);

	const gateway = (await rest.get(Routes.gatewayBot())) as GatewayBotInfo;

	const discordRecommended = gateway.shards;
	const remaining = gateway.session_start_limit.remaining;
	const total = gateway.session_start_limit.total;
	const concurrency = gateway.session_start_limit.max_concurrency;

	logger.log(
		`[Gateway] Discord recommends: ${discordRecommended} shards`.cyan
	);
	logger.log(
		`[Gateway] Session starts remaining: ${remaining}/${total}`.cyan
	);
	logger.log(`[Gateway] Max concurrency: ${concurrency}`.cyan);

	if (remaining < 10) {
		logger.warn(
			`[Gateway] ⚠️ Only ${remaining} IDENTIFY tokens left — resets in ${Math.round(gateway.session_start_limit.reset_after / 1000)}s`
				.yellow
		);
	}

	// ENV override takes priority
	if (process.env.TOTAL_SHARDS) {
		const parsed = Number(process.env.TOTAL_SHARDS);
		if (!isNaN(parsed)) {
			logger.log(
				`[Gateway] Using TOTAL_SHARDS override: ${parsed}`.yellow
			);
			return parsed;
		}
	}

	// Discord's /gateway/bot already accounts for your real guild count.
	// We take the max between their recommendation and our own tuning
	// (1 shard per GUILDS_PER_SHARD guilds — more aggressive for lower latency).
	// discordRecommended * shardMultiplier gives a guild-aware scaling factor.
	const shardMultiplier = Math.ceil(1000 / GUILDS_PER_SHARD); // 1000 = Discord's baseline per shard
	const tuned = discordRecommended * shardMultiplier;
	const final = Math.max(discordRecommended, tuned);

	logger.log(
		`[Gateway] Tuned shard count: ${final} (Discord: ${discordRecommended} × multiplier: ${shardMultiplier})`
			.green
	);
	return final;
}

// Bootstrap

const totalShards = await getOptimalShardCount();

const manager = new ShardingManager("./src/core/bot.ts", {
	totalShards,
	token,
	respawn: true
});

manager.on("shardCreate", (shard) => {
	const tag = `[Shard #${shard.id}]`.cyan;
	logger.log(`${config.console.emojis.HOST} >> ${tag} Spawning...`.green);

	shard.on("ready", () => logger.log(`${tag} ✅ Ready`.green));
	shard.on("disconnect", () => logger.warn(`${tag} ⚠️ Disconnected`.yellow));
	shard.on("reconnecting", () =>
		logger.log(`${tag} 🔄 Reconnecting...`.blue)
	);
	shard.on("death", (proc) => logger.err(`${tag} 💀 Died`.red));
	shard.on("error", (err) => logger.err(`${tag} Error: ${err.message}`.red));
});

await manager.spawn({
	amount: totalShards,
	delay: 5500,
	timeout: 30_000
});

logger.log(`✅ All ${totalShards} shards spawned`.green);
