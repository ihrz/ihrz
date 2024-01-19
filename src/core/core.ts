/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2023 iHorizon
*/

import * as checkSys from './functions/checkSys.js';
import playerManager from "./managers/playerManager.js";
import db from './functions/DatabaseModel.js';
import bash from './bash/bash.js';

import * as errorManager from './managers/errorManager.js';
import logger from "./logger.js";

import { Client, Collection, Snowflake } from "discord.js";
import { OwnIHRZ } from './managers/ownihrzManager.js';
import { GiveawaysManager_Init } from './managers/giveawaysManager.js';
import emojis from './managers/emojisManager.js';

import { VanityInviteData } from '../../types/vanityUrlData';
import { readdirSync } from "fs";
import couleurmdr from "colors";
import commandsSync from './commandsSync.js';
import config from '../files/config.js';

export default async (client: Client) => {
    logger.legacy(couleurmdr.gray("[*] iHorizon Discord Bot (https://github.com/ihrz/ihrz)."));
    logger.legacy(couleurmdr.gray("[*] Warning: iHorizon Discord bot is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 2.0."));
    logger.legacy(couleurmdr.gray("[*] Please respect the terms of this license. Learn more at: https://creativecommons.org/licenses/by-nc-sa/2.0"));

    process.on('SIGINT', async () => {
        await new OwnIHRZ().QuitProgram();
        client.destroy();
        process.exit();
    });

    checkSys.Html();

    var table_1 = db.table("BOT");
    await table_1.set(`CONTENT`, {});

    await import('../api/server.js');

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

    bash(client);
    GiveawaysManager_Init(client);
    playerManager(client);
    emojis(client);
    errorManager.uncaughtExceptionHandler();

    commandsSync(client).then(() => {
        logger.log(couleurmdr.magenta("(_) /\\  /\\___  _ __(_)_______  _ __  "));
        logger.log(couleurmdr.magenta("| |/ /_/ / _ \\| '__| |_  / _ \\| '_ \\ "));
        logger.log(couleurmdr.magenta("| / __  / (_) | |  | |/ / (_) | | | |"));
        logger.log(couleurmdr.magenta(`|_\\/ /_/ \\___/|_|  |_/___\\___/|_| |_| (${client.user?.tag}).`));
        logger.log(couleurmdr.magenta(`${config.console.emojis.KISA} >> Mainly dev by Kisakay ♀️`));    
    });
};