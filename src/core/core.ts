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

import { synchronizeCommands } from "./commandsSync.js";
import logger from "./logger.js";

import * as errorManager from "./modules/errorManager.js";
import playerManager from "./modules/playerManager.js";

import { VanityInviteData } from "../../types/vanityUrlData.js";
import { InviteCacheData } from "../../types/client.js";

import {
	Client,
	Collection,
	Snowflake,
	DefaultWebSocketManagerOptions,
	User
} from "discord.js";
import fs from "node:fs";

import assetsCalc from "./functions/assetsCalc.js";
import { StreamNotifier } from "./StreamNotifier.js";
import { KdenLive } from "./functions/kdenliveManipulator.js";
import { Command } from "../../types/command.js";
import { mkdir } from "node:fs/promises";
import { MemberCountModule } from "./modules/memberCountManager.js";
import { GatewayLink } from "./modules/gatewayLink.js";
import { AutoRenew } from "./modules/autorenewManager.js";
import { Client_Functions } from "../../types/client_functions.js";
import { AnotherCommand } from "../../types/anotherCommand.js";
import { EmojisManager } from "./modules/emojisManager.js";
import { NightModeManager } from "./modules/nightModeManager.js";
import { GithubLinesManager } from "./modules/githubLinesManager.js";
import { DiscordSlashLogParser } from "./converters/slashLog.js";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { InfrastructureMonitoring } from "./modules/infrastructureMonitoringManager.js";
import { GiveawayManager } from "./modules/giveawaysManager.js";
import { isNumber } from "./functions/method.js";
import { writeExports } from "./modules/exportsManifest.js";
import { extractResources, IS_STANDALONE } from "./modules/resources.js";
import * as backup from "./backup/src";
import * as discordTranscripts from "sweety-html-transcripts";
import { BloggerNotifier } from "./Blogger.js";
import { TemproleManager } from "./modules/tempRoleManager.js";
import { TempbanManager } from "./modules/tempbanManager.js";
import { Mailer } from "./Mailer.js";
import { LastFMScrobblerManager } from "./modules/lastFMScrobblerManager.js";

const old_slash_logs_file = `${process.cwd()}/src/files/slash.log`;
const slash_logs_file = `${process.cwd()}/src/files/slash.log.json`;

if (fs.existsSync(old_slash_logs_file)) {
	let _ = new DiscordSlashLogParser().parse(
		readFileSync(old_slash_logs_file, "utf-8")
	);
	writeFileSync(slash_logs_file, JSON.stringify(_));
	rmSync(old_slash_logs_file);
}

export const Main_iHorizon_Creator_User_ID = "126874834910183424";

export async function main(client: Client) {
	if (client.config.discord.phonePresence) {
		const { identifyProperties } = DefaultWebSocketManagerOptions;

		Object.defineProperty(identifyProperties, "browser", {
			value: "Discord Android",
			writable: true,
			enumerable: true,
			configurable: true
		});
	}

	client.commands = new Collection<string, Command>();
	client.subCommands = new Collection<string, Command>();
	client.message_commands = new Collection<string, Command>();
	client.memberCountManager = new MemberCountModule();
	client.gatewayLink = new GatewayLink(client);
	client.autoRenewManager = new AutoRenew();
	client.owners = [];
	client.content = [];
	client.category = [];
	client.invites = new Collection<
		Snowflake,
		Collection<string, InviteCacheData>
	>();
	client.vanityInvites = new Collection<Snowflake, VanityInviteData>();
	client.kdenlive = new KdenLive();
	client.selectmenu = new Collection<string, Function>();
	client.buttons = new Collection<string, Function>();
	client.func = {} as typeof Client_Functions;
	client.svgfiles = {};
	client.applicationsCommands = new Collection<string, AnotherCommand>();
	client.emojisManager = new EmojisManager();
	client.nightmodeManager = new NightModeManager();
	client.infrastructureMonitoring = new InfrastructureMonitoring();
	client.giveawaysManager = new GiveawayManager({
		storage: `${process.cwd()}/src/files/giveaways/`,
		config: {
			botsCanWin: false,
			embedColor: "#9a5af2",
			embedColorEnd: "#2f3136",
			reaction: "🎉",
			// Refresh interval in milliseconds
			forceUpdateEvery: 60_000,
			endedGiveawaysLifetime: 345_600_000
		}
	});
	client.backup = backup;
	client.discordTranscripts = discordTranscripts;
	client.temproleManager = new TemproleManager();
	client.tempbanManager = new TempbanManager();
	client.email = new Mailer();
	client.lastFMScrobbler = new LastFMScrobblerManager();
	client.creator = null;

	process.on("SIGINT", async () => {
		// await client.destroy();
		process.exit(0);
	});

	client.config.owners.users?.forEach((owner) => {
		if (isNumber(owner)) client.owners.push(owner);
	});

	// Started by `bun run dev` (no ShardingManager): refresh the generated
	// exports before the handlers import them. Shards never write them, and
	// a standalone binary has no source tree (it only extracts its files,
	// already done by its manager when sharded).
	if (IS_STANDALONE) {
		await extractResources();
	} else if (!process.env.SHARDING_MANAGER) {
		const written = await writeExports();

		if (written.length) {
			logger.log(`Rewrote exports: ${written.join(", ")}`);
		}
	}

	// Fixed order: message commands register before the hybrid ones, which
	// refuse a name or alias already taken.
	const handlers = [
		() => import("./handlers/loadAnotherStuff.js"),
		() => import("./handlers/loadApplicationsCommands.js"),
		() => import("./handlers/loadEvent.js"),
		() => import("./handlers/loadMessageCommands.js"),
		() => import("./handlers/loadSvgFile.js"),
		() => import("./handlers/loadHybridCommands.js"),
		() => import("./handlers/loadSlashCommands.js")
	];

	for (const loadHandler of handlers) {
		const { default: handlerFunction } = await loadHandler();
		await handlerFunction(client);
	}

	login();

	errorManager.uncaughtExceptionHandler(client);

	client.notifier = new StreamNotifier(
		process.env.TWITCH_APPLICATION_ID || "",
		process.env.TWITCH_APPLICATION_SECRET || "",
		process.env.YOUTUBE_API_KEY || ""
	);
	client.blogger = new BloggerNotifier();
	client.githubLinesManager = new GithubLinesManager(
		process.env.GITHUB_API_KEY
	);

	assetsCalc(client);
	playerManager(client);
}

function login() {
	client
		.login(process.env.BOT_TOKEN || client.config.discord.token)
		.catch(async (err) => {
			if (err.message?.includes("disallowed intents")) {
				const { enableRequiredIntents } =
					await import("./functions/intentEnabler.js");
				const token =
					process.env.BOT_TOKEN || client.config.discord.token;
				const ok = await enableRequiredIntents(token);
				if (ok) {
					logger.log("Intents updated. Restarting...");
					await new Promise((r) => setTimeout(r, 2000));
					process.exit(0);
				} else {
					logger.err(
						"Failed to enable intents. Manual action required."
					);
					process.exit(1);
				}
			}
		})
		.then(async () => {
			const title =
				"iHorizon - " +
				client.version.ClientVersion +
				" platform:" +
				process.platform;

			if (process.platform === "win32") {
				process.title = title;
			} else {
				process.stdout.write("\x1b]2;" + title + "\x1b\x5c");
			}

			synchronizeCommands(client).then(async () => {
				logger.log("(_) /\\  /\\___  _ __(_)_______  _ __  ".magenta);
				logger.log("| |/ /_/ / _ \\| '__| |_  / _ \\| '_ \\ ".magenta);
				logger.log("| / __  / (_) | |  | |/ / (_) | | | |".magenta);
				logger.log(
					`|_\\/ /_/ \\___/|_|  |_/___\\___/|_| |_| (${client.user?.tag}).`
						.magenta
				);
				logger.log(
					`${client.config.console.emojis.KISA} >> Mainly dev by Kisakay ♀️`
						.magenta
				);
				client.creator =
					client.users.cache.get(Main_iHorizon_Creator_User_ID) ||
					(await client.users
						.fetch(Main_iHorizon_Creator_User_ID)
						.catch(() => null)) ||
					((await client.users.fetch(client.owners[0])) as User);
			});
		});
}
