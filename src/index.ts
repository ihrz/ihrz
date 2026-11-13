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

import { loadConfig } from "./core/modules/envConfig.js";

const config = await loadConfig();
import logger from "./core/logger.js";

import { ShardingManager, REST, Routes } from "discord.js";
import { writeVersionFile } from "./core/modules/releaseNotifier.js";
import { installShardShutdown } from "./core/modules/shardShutdown.js";
import { checkExports } from "./core/modules/exportsManifest.js";
import { buildShardBundle } from "./core/modules/shardBundle.js";
import { createShardLog } from "./core/modules/shardLogChannel.js";
import { extractResources, IS_STANDALONE } from "./core/modules/resources.js";
import pkg from "../package.json";

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

logger.legacy("[*] iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz).".gray);
logger.legacy(
	"[*] Warning: iHorizon Discord bot is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International"
		.gray
);
logger.legacy(
	"[*] Please respect the terms of this license. Learn more at: https://creativecommons.org/licenses/by-nc-sa/4.0"
		.gray
);

// Standalone binary: the shards are the binary itself, its resources are
// extracted once here. From a checkout: check the exports, then build the
// shard bundle from them.
let shardEntry: string;

if (IS_STANDALONE) {
	await extractResources();
	shardEntry = process.execPath;
} else {
	// Shards only load src/exports: warn (never write, the checkout must
	// stay clean for the next git pull) when a file was added or removed
	// without regenerating them.
	const staleExports = await checkExports().catch((error) => {
		logger.err("Unable to check the generated exports:", error);
		return [];
	});

	if (staleExports.length) {
		logger.warn(
			`Stale exports (${staleExports.join(", ")}): new or removed commands, events or SVGs are not loaded. Run \`bun run gen:exports\` and commit src/exports.`
		);
	}

	shardEntry = await buildShardBundle();
}

const manager = new ShardingManager(shardEntry, {
	totalShards,
	token,
	respawn: true
});

installShardShutdown(manager);

await writeVersionFile(pkg.version);

const shardLog = createShardLog(token, config.core.shardLogsChannelID);

manager.on("shardCreate", (shard) => {
	const tag = `[Shard #${shard.id}]`.cyan;
	const name = `Shard #${shard.id}`;
	logger.log(`${config.console.emojis.HOST} >> ${tag} Spawning...`.green);

	shard.on("ready", () => {
		logger.log(`${tag} ✅ Ready`.green);
		shardLog(`✅ **${name}** ready`);
	});
	shard.on("disconnect", () => {
		logger.warn(`${tag} ⚠️ Disconnected`.yellow);
		shardLog(`⚠️ **${name}** disconnected`);
	});
	shard.on("reconnecting", () => {
		logger.log(`${tag} 🔄 Reconnecting...`.blue);
		shardLog(`🔄 **${name}** reconnecting...`);
	});
	// The session came back: nothing was lost while it reconnected.
	shard.on("resume", () => {
		logger.log(`${tag} ♻️ Resumed`.green);
		shardLog(`♻️ **${name}** resumed`);
	});
	shard.on("death", () => {
		logger.err(`${tag} 💀 Died`.red);
		shardLog(`💀 **${name}** died (respawning)`);
	});
	shard.on("error", (err) => {
		logger.err(`${tag} Error: ${err.message}`.red);
		shardLog(`❌ **${name}** error: ${err.message}`);
	});
});

await manager.spawn({
	amount: totalShards,
	delay: 5500,
	timeout: 30_000
});

logger.log(`✅ All ${totalShards} shards spawned`.green);
shardLog(`🚀 All ${totalShards} shards spawned (v${pkg.version})`);
