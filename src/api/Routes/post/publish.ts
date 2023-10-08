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

import config from '../../../files/config';

import { Request, Response } from 'express';
import { execSync } from 'child_process';
import CryptoJS from 'crypto-js';
import path from 'path';
import fs from 'fs';
import wait from 'wait';
import db from '../../../core/functions/DatabaseModel';

export = {
    type: 'post',
    apiPath: '/api/publish',
    run: async (req: Request, res: Response) => {
        let { cryptedJSON } = req.body;

        var bytes = CryptoJS.AES.decrypt(cryptedJSON, config.api.apiToken);
        var decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

        let {
            admin_key,
            auth,
            owner_one,
            owner_two,
            bot,
            expireIn,
            code
        } = decryptedData;

        if (
            !auth
            || !owner_one
            || !owner_two
            || !expireIn
            || !bot
            || !code
            || config.api.apiToken !== admin_key) {

            res.sendStatus(500);
            return;
        };

        await fs.mkdir(`${process.cwd()}/ownihrz/${code}`, { recursive: true }, (err) => {
            if (err) throw err;
        });
        await wait(1000)

        let port_range = 29268;

        let cliArray = [
            {
                l: 'git clone --branch ownihrz --depth 1 https://github.com/ihrz/ihrz.git .',
                cwd: path.resolve(process.cwd(), 'ownihrz', code)
            },
            {
                l: 'mv src/files/config.example.ts src/files/config.ts',
                cwd: path.resolve(process.cwd(), 'ownihrz', code)
            },
            {
                l: `sed -i 's/|| "The bot token",/|| "${auth}",/g' config.ts`,
                cwd: path.resolve(process.cwd(), 'ownihrz', code, 'src', 'files')
            },
            {
                l: `sed -i 's/"The discord User ID of the Owner number One",/"${owner_one}",/' config.ts`,
                cwd: path.resolve(process.cwd(), 'ownihrz', code, 'src', 'files')
            },
            {
                l: `sed -i 's/"The discord User ID of the Owner number Two",/"${owner_two}",/' config.ts`,
                cwd: path.resolve(process.cwd(), 'ownihrz', code, 'src', 'files'),
            },
            {
                l: `sed -i 's/"login\.domain\.com"/"localhost"/' config.ts`,
                cwd: path.resolve(process.cwd(), 'ownihrz', code, 'src', 'files')
            },
            {
                l: `sed -i 's/"apiToken": "The API'"'"'s token for create a request (Need to be private for security reason)",/"apiToken": "${config.api.apiToken}",/' config.ts`,
                cwd: path.resolve(process.cwd(), 'ownihrz', code, 'src', 'files')
            },
            {
                l: `sed -i 's/"useProxy": false/"useProxy": true/' config.ts`,
                cwd: path.resolve(process.cwd(), 'ownihrz', code, 'src', 'files')
            },
            {
                l: `sed -i 's/"proxyUrl": "https:\\/\\/login\\.example\\.com"/"proxyUrl": "https:\\/\\/srv\\.ihorizon\\.me"/' config.ts`,
                cwd: path.resolve(process.cwd(), 'ownihrz', code, 'src', 'files')
            },
            {
                l: `sed -i 's/"The client ID of your application"/"${config.api.clientID}"/' config.ts`,
                cwd: path.resolve(process.cwd(), 'ownihrz', code, 'src', 'files')
            },
            {
                l: `sed -i 's/"3000"/"${port_range}"/' config.ts`,
                cwd: path.resolve(process.cwd(), 'ownihrz', code, 'src', 'files')
            },
            {
                l: `sed -i 's/"blacklistPictureInEmbed": "The image of the blacklist'\\''s Embed (When blacklisted user attempt to interact with the bot)",/"blacklistPictureInEmbed": "https:\\/\\/media.discordapp.net\\/attachments\\/1099043567659384942\\/1119214828330950706\\/image.png",/' config.ts`,
                cwd: path.resolve(process.cwd(), 'ownihrz', code, 'src', 'files')
            },
            {
                l: `cp -r ./node_modules/ ./ownihrz/${code}/node_modules/`,
                cwd: path.resolve(process.cwd())
            },
            {
                l: 'npx tsc',
                cwd: path.resolve(process.cwd(), 'ownihrz', code)
            },
            {
                l: `mv dist/index.js dist/${code}.js`,
                cwd: path.resolve(process.cwd(), 'ownihrz', code)
            },
            {
                l: `pm2 start ./dist/${code}.js -f`,
                cwd: path.resolve(process.cwd(), 'ownihrz', code)
            }
        ];

        cliArray.forEach((index) => { execSync(index.l, { stdio: [0, 1, 2], cwd: index.cwd }); });

        await db.set(`OWNIHRZ.${owner_one}.${code}`,
            {
                path: path.resolve(process.cwd(), 'ownihrz', code),
                port: port_range,
                auth: auth,
                code: code,
                expireIn: expireIn,
                bot: bot
            }
        );

        return;
    },
};