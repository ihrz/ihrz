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

import { Custom_iHorizon } from "../../types/ownihrz";
import { execSync } from 'child_process';
import config from "../files/config.js";

import db from "./functions/DatabaseModel.js";
import { Client } from "discord.js";
import path from "path";

class OwnIHRZ {

    async Create(data: Custom_iHorizon) {
        let port_range = 29268;

        let cliArray = [
            {
                l: 'git clone --branch ownihrz --depth 1 https://github.com/ihrz/ihrz.git .',
                cwd: path.resolve(process.cwd(), 'ownihrz', data.Code)
            },
            {
                l: 'mv src/files/config.example.ts src/files/config.ts',
                cwd: path.resolve(process.cwd(), 'ownihrz', data.Code)
            },
            {
                l: `sed -i 's/|| "The bot token",/|| "${data.Auth}",/g' config.ts`,
                cwd: path.resolve(process.cwd(), 'ownihrz', data.Code, 'src', 'files')
            },
            {
                l: `sed -i 's/"The discord User ID of the Owner number One",/"${data.OwnerOne}",/' config.ts`,
                cwd: path.resolve(process.cwd(), 'ownihrz', data.Code, 'src', 'files')
            },
            {
                l: `sed -i 's/"The discord User ID of the Owner number Two",/"${data.OwnerTwo}",/' config.ts`,
                cwd: path.resolve(process.cwd(), 'ownihrz', data.Code, 'src', 'files'),
            },
            {
                l: `sed -i 's/"login\.domain\.com"/"localhost"/' config.ts`,
                cwd: path.resolve(process.cwd(), 'ownihrz', data.Code, 'src', 'files')
            },
            {
                l: `sed -i 's/"apiToken": "The API'"'"'s token for create a request (Need to be private for security reason)",/"apiToken": "${config.api.apiToken}",/' config.ts`,
                cwd: path.resolve(process.cwd(), 'ownihrz', data.Code, 'src', 'files')
            },
            {
                l: `sed -i 's/"useProxy": false/"useProxy": true/' config.ts`,
                cwd: path.resolve(process.cwd(), 'ownihrz', data.Code, 'src', 'files')
            },
            {
                l: `sed -i 's/"proxyUrl": "https:\\/\\/login\\.example\\.com"/"proxyUrl": "https:\\/\\/srv\\.ihorizon\\.me"/' config.ts`,
                cwd: path.resolve(process.cwd(), 'ownihrz', data.Code, 'src', 'files')
            },
            {
                l: `sed -i 's/"The client ID of your application"/"${config.api.clientID}"/' config.ts`,
                cwd: path.resolve(process.cwd(), 'ownihrz', data.Code, 'src', 'files')
            },
            {
                l: `sed -i 's/"3000"/"${port_range}"/' config.ts`,
                cwd: path.resolve(process.cwd(), 'ownihrz', data.Code, 'src', 'files')
            },
            {
                l: `sed -i 's/"blacklistPictureInEmbed": "The image of the blacklist'\\''s Embed (When blacklisted user attempt to interact with the bot)",/"blacklistPictureInEmbed": "https:\\/\\/media.discordapp.net\\/attachments\\/1099043567659384942\\/1119214828330950706\\/image.png",/' config.ts`,
                cwd: path.resolve(process.cwd(), 'ownihrz', data.Code, 'src', 'files')
            },
            {
                l: `cp -r ./node_modules/ ./ownihrz/${data.Code}/node_modules/`,
                cwd: path.resolve(process.cwd())
            },
            {
                l: 'npx tsc',
                cwd: path.resolve(process.cwd(), 'ownihrz', data.Code)
            },
            {
                l: `mv dist/index.js dist/${data.Code}.js`,
                cwd: path.resolve(process.cwd(), 'ownihrz', data.Code)
            },
            {
                l: `pm2 start ./dist/${data.Code}.js -f`,
                cwd: path.resolve(process.cwd(), 'ownihrz', data.Code)
            }
        ];

        cliArray.forEach((index) => { execSync(index.l, { stdio: [0, 1, 2], cwd: index.cwd }); });

        await db.set(`OWNIHRZ.${data.OwnerOne}.${data.Code}`,
            {
                path: (path.resolve(process.cwd(), 'ownihrz', data.Code)) as string,
                port: port_range,
                auth: data.Auth,
                code: data.Code,
                expireIn: data.ExpireIn,
                bot: data.Bot
            }
        );

        return 0;
    };

    async Startup(client: Client) {
        let result = await client.db.get("OWNIHRZ");

        for (let owner_id in result) {
            for (let bot_id in result[owner_id]) {
                if (result[owner_id][bot_id].power_off || !result[owner_id][bot_id].code) continue;

                let botPath = path.join(process.cwd(), 'ownihrz', result[owner_id][bot_id].code)

                let cliArray = [
                    {
                        line: 'rm -r dist',
                        cwd: botPath
                    },
                    {
                        line: 'git pull',
                        cwd: botPath
                    },
                    {
                        line: `npx tsc`,
                        cwd: botPath
                    },
                    {
                        line: `mv dist/index.js dist/${result[owner_id][bot_id].code}.js`,
                        cwd: botPath
                    },
                    {
                        line: `pm2 start dist/${result[owner_id][bot_id].code}.js -f`,
                        cwd: botPath
                    },
                ];

                cliArray.forEach((index) => { execSync(index.line, { stdio: [0, 1, 2], cwd: index.cwd }); });
            }
        }

        return 0;
    };


    async Refresh(client: Client) {
        let result = await client.db.get("OWNIHRZ");
        let now = new Date().getTime();

        for (let i in result) {
            for (let c in result[i]) {
                if (!result[i][c].code || result[i][c].expired) continue;
                if (now >= result[i][c].expireIn) {
                    await client.db.set(`OWNIHRZ.${i}.${c}.power_off`, true);
                    await client.db.set(`OWNIHRZ.${i}.${c}.expired`, true);

                    execSync(`pm2 stop ${result[i][c].code} -f`, {
                        stdio: [0, 1, 2],
                        cwd: process.cwd(),
                    });
                    execSync(`pm2 delete ${result[i][c].code}`, {
                        stdio: [0, 1, 2],
                        cwd: process.cwd(),
                    });
                }
            }
        }

        return 0;
    };


    async ShutDown(id_to_bot: string) {

        let cliArray = [
            {
                line: `pm2 stop ${id_to_bot} -f`,
                cwd: process.cwd()
            },
            {
                line: `pm2 delete ${id_to_bot}`,
                cwd: process.cwd()
            },
        ];

        cliArray.forEach((index) => { execSync(index.line, { stdio: [0, 1, 2], cwd: index.cwd }); });
        return 0;
    };


    async PowerOn(id_to_bot: string) {

        execSync(`pm2 start ./dist/${id_to_bot}.js -f`, {
            stdio: [0, 1, 2],
            cwd: path.join(process.cwd(), 'ownihrz', id_to_bot),
        });

        return 0;
    };


    async Delete(id_to_bot: string) {
        
        let cliArray = [
            {
                line: `pm2 stop ${id_to_bot} -f`,
                cwd: process.cwd()
            },
            {
                line: `pm2 delete ${id_to_bot}`,
                cwd: process.cwd()
            },
            {
                line: 'rm -rf *',
                cwd: process.cwd()
            },
        ];

        cliArray.forEach((index) => { execSync(index.line, { stdio: [0, 1, 2], cwd: index.cwd }); });
        return 0;
    };

    async QuitProgram() {
        let result = await db.get('OWNIHRZ');

        for (let i in result) {
            for (let c in result[i]) {
                if (i !== 'TEMP' && !result[i][c].power_off) {
                    let botPath = path.join(process.cwd(), 'ownihrz', result[i][c].code);

                    execSync(`pm2 stop ${result[i][c].code}`, {
                        stdio: [0, 1, 2],
                        cwd: botPath,
                    });
                };
            }
        };

        return 0;
    };
}

export { OwnIHRZ }