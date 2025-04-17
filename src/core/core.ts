/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import commandsSync from './commandsSync.js';
import logger from "./logger.js";

import * as errorManager from './modules/errorManager.js';

import { VanityInviteData } from '../../types/vanityUrlData.js';

import { Client, Collection, Snowflake, DefaultWebSocketManagerOptions } from 'discord.js';
import backup from 'discord-rebackup';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

import { iHorizonTimeCalculator } from './functions/ms.js';
import assetsCalc from "./functions/assetsCalc.js";
import { setMaxListeners } from 'node:events';
import { version } from '../version.js';
import { InitData } from '../../types/initDataType.js';
import { CacheStorage } from './cache.js';
import DatabaseModel from './functions/DatabaseModel.js';
import { Command } from '../../types/command.js';
import { mkdir, readdir } from 'node:fs/promises';
import { readdirSync } from 'node:fs';
import { MemberCountModule } from './modules/memberCountManager.js';
import { AutoRenew } from './modules/autorenewManager.js';
import config from '../files/config.js';
import { Client_Functions } from '../../types/client_functions.js';
import { AnotherCommand } from '../../types/anotherCommand.js';
import { EmojisManager } from './modules/emojisManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backups_folder = `${process.cwd()}/src/files/backups`;

if (!fs.existsSync(backups_folder)) {
	await mkdir(backups_folder, { recursive: true });
}

backup.setStorageFolder(backups_folder);

export async function main(client: Client) {
	dataInitializer();

	process.on('SIGINT', async () => {
		await client.destroy();
		process.exit(0);
	});

	client.owners = [];
	client.config.owner.owners?.forEach(owner => {
		if (!Number.isNaN(Number.parseInt(owner))) client.owners.push(owner);
	});
	if (!Number.isNaN(client.config.owner.ownerid1)) client.owners.push(client.config.owner.ownerid1);
	if (!Number.isNaN(Number.parseInt(client.config.owner.ownerid2))) client.owners.push(client.config.owner.ownerid2)

	setMaxListeners(0);
	errorManager.uncaughtExceptionHandler(client);
	client.db = DatabaseModel;
	global.client = client;
	client.commands = new Collection<string, Command>();
	client.subCommands = new Collection<string, Command>();
	client.message_commands = new Collection<string, Command>();
	client.memberCountManager = new MemberCountModule(client);
	client.autoRenewManager = new AutoRenew(client);
	client.content = [];
	client.category = [];
	client.invites = new Collection();
	client.timeCalculator = new iHorizonTimeCalculator();
	client.vanityInvites = new Collection<Snowflake, VanityInviteData>();
	client.selectmenu = new Collection<string, Function>();
	client.buttons = new Collection<string, Function>();
	client.func = {} as typeof Client_Functions;
	client.htmlfiles = {};
	client.applicationsCommands = new Collection<string, AnotherCommand>();
	client.emojisManager = new EmojisManager(client);

	assetsCalc(client);

	let handlerPath = path.join(__dirname, '..', 'core', 'handlers');
	let handlerFiles = (await readdir(handlerPath)).filter(file => file.endsWith('.ts'));

	for (const file of handlerFiles) {
		const { default: handlerFunction } = await import(`${handlerPath}/${file}`);
		if (handlerFunction && typeof handlerFunction === 'function') {
			await handlerFunction(client);
		}
	}

	client.login(client.config.discord.token).then(async () => {
		const title = "iHorizon - " + client.version.ClientVersion + " platform:" + process.platform;

		if (process.platform === 'win32') {
			process.title = title;
		} else {
			process.stdout.write('\x1b]2;' + title + '\x1b\x5c');
		};

		commandsSync(client).then(() => {
			logger.log("(_) /\\  /\\___  _ __(_)_______  _ __  ".magenta);
			logger.log("| |/ /_/ / _ \\| '__| |_  / _ \\| '_ \\ ".magenta);
			logger.log("| / __  / (_) | |  | |/ / (_) | | | |".magenta);
			logger.log(`|_\\/ /_/ \\___/|_|  |_/___\\___/|_| |_| (${client.user?.tag}).`.magenta);
			logger.log(`${client.config.console.emojis.KISA} >> Mainly dev by Kisakay ♀️`.magenta);
		});
	});
};

export function dataInitializer() {
	let baseData: InitData = {
		initialized_timestamp: Date.now(),
		_cache: {
			version: getCacheStorage()?._cache.version || version,
			updateChannelId: getCacheStorage()?._cache.updateChannelId || "None"
		}
	}
	CacheStorage.set("stored_data", baseData)
	logger.log(`${config.console.emojis.OK} >> Timestamp Generated in .uptime`);
}

export function getCacheStorage(): InitData | undefined {
	return CacheStorage.get("stored_data");
}