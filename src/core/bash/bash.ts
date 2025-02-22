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

import pkg from 'ssh2';

import os from 'os';
import fs from 'fs';
import readline from 'readline';
import { Client } from 'discord.js';
import getIP from '../functions/getIp.js';
import { mkdir } from 'fs/promises';
import crypto from 'crypto';
import path from 'path';
import logger from '../logger.js';
import process from 'process';

function niceBytes(a: Number) { let b = 0, c = parseInt((a.toString()), 10) || 0; for (; 1024 <= c && ++b;)c /= 1024; return c.toFixed(10 > c && 0 < b ? 1 : 0) + " " + ["bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"][b] }

export default async (client: Client) => {
    if (!client.config.core.bash) {
        return;
    }

    const PORT = 3871;

    const user = {
        username: process.env.USER || "ihrz",
        password: client.config.api.apiToken
    };

    const HOST_KEY_PATH = path.join(process.cwd(), 'src', 'files', 'host.key');

    // Generate SSH key if it doesn't exist
    if (!fs.existsSync(HOST_KEY_PATH)) {
        logger.log(`${client.config.console.emojis.LOAD} >> Generating SSH key...`);
        const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
        });
        fs.writeFileSync(HOST_KEY_PATH, privateKey);
        fs.writeFileSync(`${HOST_KEY_PATH}.pub`, publicKey);
        logger.log(`${client.config.console.emojis.OK} >> SSH key successfully generated`.green);
    }

    const server = new pkg.Server({
        hostKeys: [fs.readFileSync(HOST_KEY_PATH)]
    }, (clientSSH) => {

        clientSSH.on('authentication', (ctx) => {
            if (ctx.method !== 'password' || user.username !== ctx.username) {
                ctx.reject();
            } else if (user.password !== ctx.password?.toString()) {
                clientSSH.end();
            } else {
                ctx.accept();
            }
        }).on('ready', () => {
            clientSSH.on('session', (accept) => {
                const session = accept();
                session.on('pty', (accept) => {
                    accept();
                });
                session.on('shell', async (accept) => {
                    const stream = accept();

                    let rl = readline.createInterface({
                        input: stream as any,
                        output: stream as any,
                        terminal: true
                    });

                    (stream as any)._rl = rl;

                    rl.on('SIGINT', () => {
                        stream.write('\n\r');
                        rl.prompt();
                    });

                    let bash_history_path = `${process.cwd()}/src/files`;
                    if (!fs.existsSync(bash_history_path)) {
                        await mkdir(bash_history_path, { recursive: true });
                    }
                    let createFiles = fs.createWriteStream(bash_history_path + '/.bash_history', { flags: 'a' });

                    let table = client.db?.table('BASH');
                    let LoadFiles = await table?.get(`LAST_LOGIN`) || 'None';
                    let LoadFiles2 = '127.0.0.1';

                    await table?.set(`LAST_LOGIN`, new Date().toISOString());

                    stream.write(`Welcome to iHorizon Bash\n\r\n\r`);
                    stream.write(`Memory usage: ${niceBytes(os.totalmem() - os.freemem())}/${niceBytes(os.totalmem())}\n\r`);
                    stream.write(`IPv4 address: ${await getIP({ useIPv6: false })}\n\r\n\r`);
                    stream.write(`Last login: ${LoadFiles} from ${LoadFiles2}\n\r\n\r`);

                    rl.setPrompt((user.username + '@ihorizon').green.boldText + ":".white.boldText + `~${process.cwd()}`.blue.boldText + "$ ".white.boldText);
                    rl.prompt();

                    rl.on('line', async (line) => {
                        let [commandName, ...args] = line.trim().split(' ');
                        let command = client.bash?.get(commandName);

                        if (command) {
                            command.run(client, stream, args);
                            createFiles.write(`${line}\r\n\r`);
                        } else if (commandName === "exit") {
                            stream.write('logout\n\r');
                            stream.end();
                        } else if (commandName !== '') {
                            stream.write(`${commandName}: command not found\n\r`);
                        } else {
                            stream.write('\r');
                        }
                        rl.prompt();
                    });
                });
            });
        }).on('end', () => {
            logger.log(`${client.config.console.emojis.HOST} >> SSH client disconnected`);
        });
    });

    server.listen(PORT, () => {
        logger.log(`${client.config.console.emojis.HOST} >> SSH server listening on port ${PORT}`);
    });
};