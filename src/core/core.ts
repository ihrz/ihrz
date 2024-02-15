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

import * as checkSys from './functions/checkSys.js';
import playerManager from "./modules/playerManager.js";
import db from './functions/DatabaseModel.js';
import bash from './bash/bash.js';

import * as errorManager from './modules/errorManager.js';
import logger from "./logger.js";

import { Client, Collection, Snowflake } from "discord.js";
import { OwnIHRZ } from './modules/ownihrzManager.js';
import emojis from './modules/emojisManager.js';

import { VanityInviteData } from '../../types/vanityUrlData';
import { readdirSync } from "node:fs";
import couleurmdr from "colors";
import commandsSync from './commandsSync.js';
import config from '../files/config.js';
import { GiveawayManager } from 'discord-regiveaways';

export default async (client: Client) => {
    logger.legacy(couleurmdr.gray("[*] iHorizon Discord Bot (https://github.com/ihrz/ihrz)."));
    logger.legacy(couleurmdr.gray("[*] Warning: iHorizon Discord bot is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 2.0."));
    logger.legacy(couleurmdr.gray("[*] Please respect the terms of this license. Learn more at: https://creativecommons.org/licenses/by-nc-sa/2.0"));

    errorManager.uncaughtExceptionHandler();

    client.giveawaysManager = new GiveawayManager(client, {
        config: {
            botsCanWin: false,
            embedColor: '#9a5af2',
            embedColorEnd: '#2f3136',
            reaction: '🎉',
            botName: "iHorizon",
            forceUpdateEvery: 3600,
            endedGiveawaysLifetime: 345_600_000,
        },
    });

    process.on('SIGINT', async () => {
        client.destroy();
        await new OwnIHRZ().QuitProgram();
        process.exit();
    });

    checkSys.Html();

    var table_1 = db.table("BOT");
    await table_1.set(`CONTENT`, {});

    await import('../api/server.js');

    playerManager(client);
    bash(client);
    emojis(client);
    
    client.db = db;
    client.invites = new Collection();
    client.vanityInvites = new Collection<Snowflake, VanityInviteData>();

    let handlerPath = `${process.cwd()}/dist/src/core/handlers`;
    let handlerFiles = readdirSync(handlerPath).filter(file => file.endsWith('.js'));

    for (const file of handlerFiles) {
        const { default: handlerFunction } = await import(`${handlerPath}/${file}`);
        if (handlerFunction && typeof handlerFunction === 'function') {
            await handlerFunction(client);
        }
    }

    client.login(config.discord.token).then(() => {
        commandsSync(client).then(() => {
            logger.log(couleurmdr.magenta("(_) /\\  /\\___  _ __(_)_______  _ __  "));
            logger.log(couleurmdr.magenta("| |/ /_/ / _ \\| '__| |_  / _ \\| '_ \\ "));
            logger.log(couleurmdr.magenta("| / __  / (_) | |  | |/ / (_) | | | |"));
            logger.log(couleurmdr.magenta(`|_\\/ /_/ \\___/|_|  |_/___\\___/|_| |_| (${client.user?.tag}).`));
            logger.log(couleurmdr.magenta(`${config.console.emojis.KISA} >> Mainly dev by Kisakay ♀️`));
        });
    });
};