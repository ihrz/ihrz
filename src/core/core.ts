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
	DefaultWebSocketManagerOptions
} from "discord.js";
import { fileURLToPath } from "url";
import path from "path";
import fs from "node:fs";

import assetsCalc from "./functions/assetsCalc.js";
import { StreamNotifier } from "./StreamNotifier.js";
import { KdenLive } from "./functions/kdenliveManipulator.js";
import { Command } from "../../types/command.js";
import { mkdir, readdir } from "node:fs/promises";
import { MemberCountModule } from "./modules/memberCountManager.js";
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
import * as backup from "./backup/src";
import * as discordTranscripts from "discord-html-transcripts";
import { BloggerNotifier } from "./Blogger.js";
import { TemproleManager } from "./modules/tempRoleManager.js";
import { TempbanManager } from "./modules/tempbanManager.js";
import { Mailer } from "./Mailer.js";
import { LastFMScrobblerManager } from "./modules/lastFMScrobblerManager.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const backups_folder = `${process.cwd()}/src/files/backups`;
const old_slash_logs_file = `${process.cwd()}/src/files/slash.log`;
const slash_logs_file = `${process.cwd()}/src/files/slash.log.json`;

if (!fs.existsSync(backups_folder)) {
	await mkdir(backups_folder, { recursive: true });
}

if (fs.existsSync(old_slash_logs_file)) {
	let _ = new DiscordSlashLogParser().parse(
		readFileSync(old_slash_logs_file, "utf-8")
	);
	writeFileSync(slash_logs_file, JSON.stringify(_));
	rmSync(old_slash_logs_file);
}

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
	client.htmlfiles = {};
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
			forceUpdateEvery: 3600,
			endedGiveawaysLifetime: 345_600_000
		}
	});
	client.backup = backup;
	client.discordTranscripts = discordTranscripts;
	client.temproleManager = new TemproleManager();
	client.tempbanManager = new TempbanManager();
	client.email = new Mailer();
	client.lastFMScrobbler = new LastFMScrobblerManager();

	process.on("SIGINT", async () => {
		// await client.destroy();
		process.exit(0);
	});

	client.config.owners.users?.forEach((owner) => {
		if (isNumber(owner)) client.owners.push(owner);
	});

	const handlerPath = path.join(__dirname, "..", "core", "handlers");
	const handlerFiles = (await readdir(handlerPath)).filter((file) =>
		file.endsWith(".ts")
	);

	for (const file of handlerFiles) {
		const { default: handlerFunction } = await import(
			`${handlerPath}/${file}`
		);
		if (handlerFunction && typeof handlerFunction === "function") {
			await handlerFunction(client);
		}
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

			synchronizeCommands(client).then(() => {
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
			});
		});
}
