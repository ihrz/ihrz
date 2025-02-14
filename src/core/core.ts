/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import commandsSync from './commandsSync.js';
import bash from './bash/bash.js';
import logger from "./logger.js";

import * as errorManager from './modules/errorManager.js';
import playerManager from "./modules/playerManager.js";
import { OwnIHRZ } from './modules/ownihrzManager.js';
import emojis from './modules/emojisManager.js';

import { VanityInviteData } from '../../types/vanityUrlData.js';
import { ConfigData } from '../../types/configDatad.js';

import { Client, Collection, Snowflake, DefaultWebSocketManagerOptions } from 'discord.js';
import backup from 'discord-rebackup';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

import { LyricsManager } from './functions/lyrics_fetcher.js';
import { iHorizonTimeCalculator } from './functions/ms.js';
import assetsCalc from "./functions/assetsCalc.js";
import { getToken } from './functions/getToken.js';
import { StreamNotifier } from './StreamNotifier.js';
import { setMaxListeners } from 'node:events';
import { version } from '../version.js';
import { InitData } from '../../types/initDataType.js';
import { CacheStorage } from './cache.js';
import { getDatabaseInstance } from './database.js';
import { KdenLive } from './functions/kdenliveManipulator.js';
import { Command } from '../../types/command.js';
import { BashCommands } from '../../types/bashCommands.js';
import { mkdir, readdir } from 'node:fs/promises';
import { MemberCountModule } from './modules/memberCountManager.js';
import { AutoRenew } from './modules/autorenewManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backups_folder = `${process.cwd()}/src/files/backups`;

let global_config: ConfigData;

if (!fs.existsSync(backups_folder)) {
    await mkdir(backups_folder, { recursive: true });
}

backup.setStorageFolder(backups_folder);

export async function main(client: Client) {
    initConfig(client.config);
    dataInitializer();

    if (client.config.discord.phonePresence) {

        const { identifyProperties } = DefaultWebSocketManagerOptions;

        Object.defineProperty(identifyProperties, 'browser', {
            value: "Discord Android",
            writable: true,
            enumerable: true,
            configurable: true
        });
    };

    setMaxListeners(0)

    client.bash = new Collection<string, BashCommands>();
    client.commands = new Collection<string, Command>();
    client.subCommands = new Collection<string, Command>();
    client.message_commands = new Collection<string, Command>();
    client.memberCountManager = new MemberCountModule(client);
    client.autoRenewManager = new AutoRenew(client);
    client.owners = [];
    client.content = [];
    client.category = [];
    client.invites = new Collection();
    client.timeCalculator = new iHorizonTimeCalculator();
    client.lyricsSearcher = new LyricsManager();
    client.vanityInvites = new Collection<Snowflake, VanityInviteData>();
    client.ownihrz = new OwnIHRZ(client)
    client.kdenlive = new KdenLive();

    process.on('SIGINT', async () => {
        if (client.config.core.shutdownClusterWhenStop) await client.ownihrz.QuitProgram();
        await client.destroy();
        process.exit(0);
    });

    client.config.owner.owners?.forEach(owner => {
        if (!Number.isNaN(Number.parseInt(owner))) client.owners.push(owner);
    });
    if (!Number.isNaN(client.config.owner.ownerid1)) client.owners.push(client.config.owner.ownerid1);
    if (!Number.isNaN(Number.parseInt(client.config.owner.ownerid2))) client.owners.push(client.config.owner.ownerid2)

    errorManager.uncaughtExceptionHandler(client);
    client.db = getDatabaseInstance();
    client.notifier = new StreamNotifier(client,
        process.env.TWITCH_APPLICATION_ID || "",
        process.env.TWITCH_APPLICATION_SECRET || "",
        process.env.YOUTUBE_API_KEY || ""
    );

    assetsCalc(client);
    playerManager(client);
    bash(client);
    emojis(client);
    let handlerPath = path.join(__dirname, '..', 'core', 'handlers');
    let handlerFiles = (await readdir(handlerPath)).filter(file => file.endsWith('.js'));

    for (const file of handlerFiles) {
        const { default: handlerFunction } = await import(`${handlerPath}/${file}`);
        if (handlerFunction && typeof handlerFunction === 'function') {
            await handlerFunction(client);
        }
    }

    client.login(await getToken() || process.env.BOT_TOKEN || client.config.discord.token).then(async () => {
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

export const initConfig = (config: ConfigData) => {
    global_config = config
};

export const getConfig = (): ConfigData => {
    if (!global_config) {
        throw new Error('Configuration file has not been initialized. Call initConfig first.');
    }
    return global_config;
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
    logger.log(`${global_config.console.emojis.OK} >> Timestamp Generated in .uptime`);
}

export function getCacheStorage(): InitData | undefined {
    return CacheStorage.get("stored_data");
}