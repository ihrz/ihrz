/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import playerManager from "./modules/playerManager.js";
import db from './functions/DatabaseModel.js';

import * as errorManager from './modules/errorManager.js';
import logger from "./logger.js";

import { Client, Collection, Snowflake } from "discord.js";
import emojis from './modules/emojisManager.js';

import { VanityInviteData } from '../../types/vanityUrlData';
import { readdirSync } from "node:fs";
import commandsSync from './commandsSync.js';
import config from '../files/config.js';
import { GiveawayManager } from 'discord-regiveaways';
import { iHorizonTimeCalculator } from './functions/ms.js';
import { LyricsManager } from './functions/lyrics-fetcher.js';

import backup from 'discord-rebackup';

backup.setStorageFolder(`${process.cwd()}/src/files/backups`);

export default async (client: Client) => {
    logger.legacy("[*] iHorizon Discord Bot (https://github.com/ihrz/ihrz).".gray());
    logger.legacy("[*] Warning: iHorizon Discord bot is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 2.0.".gray());
    logger.legacy("[*] Please respect the terms of this license. Learn more at: https://creativecommons.org/licenses/by-nc-sa/2.0".gray());

    errorManager.uncaughtExceptionHandler();

    process.on('SIGINT', async () => {
        client.destroy();
        process.exit();
    });

    client.db = db;
    client.content = [];
    client.category = [];
    client.invites = new Collection();
    client.timeCalculator = new iHorizonTimeCalculator();
    client.lyricsSearcher = new LyricsManager();
    client.vanityInvites = new Collection<Snowflake, VanityInviteData>();

    let handlerPath = `${process.cwd()}/dist/src/core/handlers`;
    let handlerFiles = readdirSync(handlerPath).filter(file => file.endsWith('.js'));

    for (const file of handlerFiles) {
        const { default: handlerFunction } = await import(`${handlerPath}/${file}`);
        if (handlerFunction && typeof handlerFunction === 'function') {
            await handlerFunction(client);
        }
    }

    playerManager(client);
    emojis(client);
    errorManager.uncaughtExceptionHandler();

    client.login(config.discord.token).then(() => {
        client.giveawaysManager = new GiveawayManager(client, {
            storage: `${process.cwd()}/src/files/giveaways/`,
            config: {
                botsCanWin: false,
                embedColor: '#9a5af2',
                embedColorEnd: '#2f3136',
                reaction: '🎉',
                botName: client.user?.username,
                forceUpdateEvery: 3600,
                endedGiveawaysLifetime: 345_600_000,
            },
        });
        
        commandsSync(client).then(() => {
            logger.log("(_) /\\  /\\___  _ __(_)_______  _ __  ".magenta());
            logger.log("| |/ /_/ / _ \\| '__| |_  / _ \\| '_ \\ ".magenta());
            logger.log("| / __  / (_) | |  | |/ / (_) | | | |".magenta());
            logger.log(`|_\\/ /_/ \\___/|_|  |_/___\\___/|_| |_| (${client.user?.tag}).`.magenta());
            logger.log(`${config.console.emojis.KISA} >> Mainly dev by Kisakay ♀️`.magenta());
        });
    });
};