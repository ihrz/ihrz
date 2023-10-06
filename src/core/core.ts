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

import * as checkSys from './functions/checkSys';
import playerManager from "./playerManager";
import bash from './bash/bash';

import * as errorManager from './errorManager';
import logger from "./logger";

import { Client, Collection } from "discord.js";
import { Init } from './giveawaysManager';
import { execSync } from 'child_process';

import { readdirSync } from "fs";
import couleurmdr from "colors";
import path from 'path';
import fs from 'fs';
import * as db from './functions/DatabaseModel';

function cleanTempDir() {
    let folderPath = `${process.cwd()}/src/temp`;

    fs.readdir(folderPath, (err, files) => {
        if (err) return;

        files.forEach((file) => {
            let filePath = path.join(folderPath, file);

            if (file !== 'here') {
                fs.unlink(filePath, (err) => {
                    if (err) return;
                });
            };
        });
    });

};

export = (client: Client) => {
    logger.legacy(couleurmdr.gray("[*] iHorizon Discord Bot (https://github.com/ihrz/ihrz)."));
    logger.legacy(couleurmdr.gray("[*] Warning: iHorizon Discord bot is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 2.0."));
    logger.legacy(couleurmdr.gray("[*] Please respect the terms of this license. Learn more at: https://creativecommons.org/licenses/by-nc-sa/2.0"));

    process.on('SIGINT', async () => {

        let result = await db.DataBaseModel({
            id: db.Get,
            key: `OWNIHRZ`
        });

        for (let i in result) {
            for (let c in result[i]) {
                if (i !== 'TEMP' && !result[i][c].power_off) {
                    execSync(`pm2 stop ${result?.[i]?.[c]?.code}`, {
                        stdio: [0, 1, 2],
                        cwd: result?.[i]?.[c]?.path,
                    });
                };
            }
        };

        process.exit();
    });

    cleanTempDir();
    checkSys.Html();

    readdirSync(`${process.cwd()}/dist/src/core/handlers`).filter(file => file.endsWith('.js')).forEach(file => {
        require(`${process.cwd()}/dist/src/core/handlers/${file}`)(client);
    });

    client.invites = new Collection();

    require('../api/server'),
        bash(client),
        Init(client),
        playerManager(client),
        errorManager.uncaughtExceptionHandler();
};