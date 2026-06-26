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

import { Client } from "discord.js";
import { initializeDatabase } from "../src/core/database/index.js";
import config from "../src/files/config.js";
import * as ClientVersion from "../src/version.js";
import { readFile } from "fs/promises";
import path from "path";
import * as customProfileHelper from "../src/core/functions/customProfileHelper.js";
import logger from "../src/core/logger.js";

interface CustomEnabledGuild {
	guildId: string;
	guildName: string;
	lastUsedAt: number;
	uses: number;
}

const inputPath = path.join(
	process.cwd(),
	"src",
	"files",
	"custom-enabled-guilds.json"
);
const shouldApply = process.argv.includes("--apply");
const mode = shouldApply ? "apply" : "dry-run";

global.client = new Client({ intents: [] });
client.config = config;
client.version = ClientVersion;
client.inShard = function (guildId: string): boolean {
	const shardId = client.shard?.ids?.[0] ?? 0;
	const totalShards = client.options.shardCount ?? 1;
	let guildShard: number | null = null;

	try {
		guildShard = Number((BigInt(guildId) >> 22n) % BigInt(totalShards));
	} catch {
		guildShard = shardId;
	}

	return guildShard === shardId;
};
client.isMainShard = function (): boolean {
	return client.shard?.ids[0] === 0;
};

const { x, y } = await initializeDatabase(config.database);
client.db = x;
if (y) client.db2 = y;

await client.login(client.config.discord.token);
await new Promise<void>((resolve) => {
	if (client.isReady()) return resolve();
	client.once("clientReady", () => resolve());
});

const shardId = client.shard?.ids?.[0] ?? 0;
const totalShards = client.options.shardCount ?? 1;
const raw = await readFile(inputPath, "utf-8");
const guilds = (JSON.parse(raw) as CustomEnabledGuild[]).filter((entry) => {
	try {
		return (
			Number((BigInt(entry.guildId) >> 22n) % BigInt(totalShards)) ===
			shardId
		);
	} catch {
		return false;
	}
});

logger.log(
	`Shard worker #${shardId} started in ${mode} mode with ${guilds.length} guilds.`
);
logger.debug(`Shard worker logged in as ${client.user?.tag}`);

const defaultAvatarUrl = client.user?.avatarURL({
	extension: "png",
	size: 4096
});
logger.debug(`Default avatar URL: ${defaultAvatarUrl || "null"}`);
const defaultAvatarBase64 = defaultAvatarUrl
	? Buffer.from(await (await fetch(defaultAvatarUrl)).arrayBuffer()).toString(
			"base64"
		)
	: null;
logger.debug(
	`Default avatar base64 loaded: ${defaultAvatarBase64 ? "yes" : "no"}`
);

let res = await fetch("https://discord.com/api/v10/oauth2/applications/@me", {
	headers: {
		Authorization: `Bot ${process.env.BOT_TOKEN || client.config.discord.token}`
	}
});
const data = await res.json();
const defaultBannerUrl =
	`https://cdn.discordapp.com/banners/${client.user?.id}/${data?.["bot"]["banner"]}?size=1024` ||
	client.user?.bannerURL({
		extension: "png",
		size: 4096
	}) ||
	null;
logger.debug(`Default banner URL: ${defaultBannerUrl || "null"}`);
const defaultBannerBase64 = defaultBannerUrl
	? Buffer.from(await (await fetch(defaultBannerUrl)).arrayBuffer()).toString(
			"base64"
		)
	: null;
logger.debug(
	`Default banner base64 loaded: ${defaultBannerBase64 ? "yes" : "no"}`
);

const defaultBio = data?.["description"] || "iHorizon";
const defaultName =
	client.user?.displayName || client.user?.username || "iHorizon";
logger.debug(`Default name: ${defaultName}`);
logger.debug(`Default bio: ${defaultBio}`);

for (const entry of guilds) {
	logger.debug(
		`Processing guild ${entry.guildId} (${entry.guildName}) with ${entry.uses} custom uses on shard ${shardId}.`
	);

	const guild = await client.guilds.fetch(entry.guildId).catch((error) => {
		logger.debug(
			`Failed to fetch guild ${entry.guildId}: ${String(error)}`
		);
		return null;
	});
	if (!guild) {
		logger.warn(
			`Guild ${entry.guildId} not found on this shard, skipping.`
		);
		continue;
	}
	logger.debug(`Fetched guild ${guild.id} (${guild.name})`);

	if (!shouldApply) {
		logger.log(
			`[DRY-RUN] Would clear custom profile for ${entry.guildId} (${entry.guildName})`
		);
		logger.debug(
			`[DRY-RUN] Would delete DB key ${entry.guildId}.BOT.botName`
		);
		logger.debug(
			`[DRY-RUN] Would delete DB key ${entry.guildId}.BOT.botPFP`
		);
		logger.debug(`[DRY-RUN] Would reset name to: ${defaultName}`);
		logger.debug(
			`[DRY-RUN] Would reset avatar: ${defaultAvatarBase64 ? "yes" : "no"}`
		);
		logger.debug(
			`[DRY-RUN] Would reset banner: ${defaultBannerBase64 ? "yes" : "no"}`
		);
		logger.debug(`[DRY-RUN] Would reset bio to: ${defaultBio}`);
		continue;
	}

	logger.debug(`Deleting DB key ${entry.guildId}.BOT.botName`);
	await client.db.delete(`${entry.guildId}.BOT.botName`);
	logger.debug(`Deleting DB key ${entry.guildId}.BOT.botPFP`);
	await client.db.delete(`${entry.guildId}.BOT.botPFP`);

	logger.debug(`Resetting guild bot name for ${entry.guildId}`);
	const nameReset = await customProfileHelper.changeGuildBotName(
		guild,
		defaultName
	);
	logger.debug(`Guild ${entry.guildId} name reset result: ${nameReset}`);

	if (defaultAvatarBase64) {
		logger.debug(`Resetting guild bot avatar for ${entry.guildId}`);
		const avatarReset = await customProfileHelper.changeGuildBotAvatar(
			guild,
			`data:image/png;base64,${defaultAvatarBase64}`
		);
		logger.debug(
			`Guild ${entry.guildId} avatar reset result: ${avatarReset}`
		);
	} else {
		logger.warn(`No default avatar found for guild ${entry.guildId}`);
	}

	if (defaultBannerBase64) {
		logger.debug(`Resetting guild bot banner for ${entry.guildId}`);
		const bannerReset = await customProfileHelper.changeGuildBotBanner(
			guild,
			`data:image/png;base64,${defaultBannerBase64}`
		);
		logger.debug(
			`Guild ${entry.guildId} banner reset result: ${bannerReset}`
		);
	} else {
		logger.warn(`No default banner found for guild ${entry.guildId}`);
	}

	logger.debug(`Resetting guild bot bio for ${entry.guildId}`);
	const bioReset = await customProfileHelper.changeGuildBotBio(
		guild,
		defaultBio
	);
	logger.debug(`Guild ${entry.guildId} bio reset result: ${bioReset}`);

	logger.log(
		`Custom profile cleared for ${entry.guildId} (${entry.guildName})`
	);
}

logger.debug("Destroying shard worker client.");
await client.destroy();
logger.log(`Shard worker #${shardId} finished in ${mode} mode.`);
process.exit(0);
