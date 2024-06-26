/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import { Client } from 'pwss';
import logger from "../logger.js";
import readline from 'readline';
import os from 'node:os';
import fs from 'node:fs';

import getIP from "../functions/getIp.js";
import wait from "../functions/wait.js";

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function niceBytes(a: Number) { let b = 0, c = parseInt((a.toString()), 10) || 0; for (; 1024 <= c && ++b;)c /= 1024; return c.toFixed(10 > c && 0 < b ? 1 : 0) + " " + ["bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"][b] }

export default async (client: Client) => {
    if (!client.config.core.bash) return;

    let rl = readline.createInterface({
        input: process.stdin as any,
        output: process.stdout as any
    });

    let now2 = new Date();
    let dateStr = `${now2.toLocaleString('default', { day: '2-digit' })} ${now2.toLocaleString('default', { month: 'short' })} ${now2.getFullYear().toString().substr(-2)} ${now2.toLocaleTimeString('en-US', { hour12: false })} 2023`.toString();

    logger.legacy(`* iHorizon bash terminal is in power on...`.gray.bgBlack);
    await wait(1000);
    logger.legacy(`* iHorizon bash terminal is in booting...`.gray.bgBlack);
    await wait(1000);
    logger.legacy(`* iHorizon bash terminal is in loading...`.gray.bgBlack);
    await wait(1000);
    logger.legacy(`* iHorizon has been loaded !`.gray.bgBlack);

    let now = new Date();

    let formattedDate = now.toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit',
        minute: '2-digit', second: '2-digit', timeZone: 'UTC'
    });

    let table = client.db.table('BASH');
    let LoadFiles = await table.get(`LAST_LOGIN`) || "None";
    let LoadFiles2 = "127.0.0.1";

    let bash_history_path = `${process.cwd()}/src/files`

    if (!fs.existsSync(bash_history_path)) {
        fs.mkdirSync(bash_history_path, { recursive: true });
    }

    let createFiles = fs.createWriteStream(bash_history_path + '/.bash_history', { flags: 'a' });

    await table.set(`LAST_LOGIN`, dateStr);
    logger.legacy(`Welcome to iHorizon Bash
    
    * Documentation:  https://github.com/ihrz/ihrz/blob/main/README.md
    
     System information as of mar.  ${formattedDate}
     Memory usage:                  ${niceBytes(os.totalmem() - os.freemem())}/${niceBytes(os.totalmem())}
     IPv4 address for eth0:         ${await getIP({ useIPv6: false })}
    
    
    Last login: ${LoadFiles} from ${LoadFiles2}`);

    rl.setPrompt('kisakay@ihorizon'.green + ":".white + `${process.cwd()}`.blue + "$ ".white);
    rl.prompt();
    rl.on('line', async (line) => {
        let [commandName, ...args] = line.trim().split(' ');
        let commandPath = path.join(__dirname, 'commands', commandName + '.js')

        if (fs.existsSync(commandPath)) {
            let command = await import(commandPath);
            command.default(client, args.join(' '));

            if (commandName) {
                createFiles.write(`${line}\r\n`);
            }
        } else if (commandName) {
            logger.legacy(`Command not found: ${commandName}`);
        }

        rl.prompt();
    });
};