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

import { Client } from "discord.js";
import { execSync } from 'child_process';
import path from "path";
import fs from 'fs';

class OwnIHRZ {

    async Startup(client: Client) {
        let result = await client.db.get("OWNIHRZ");

        for (let i in result) {
            for (let c in result[i]) {
                if (result[i][c].power_off
                    || !result[i][c].code) break;

                let botPath = path.join(process.cwd(), 'ownihrz', result[i][c].code)

                if (i !== 'TEMP') {
                    if (fs.existsSync(path.join(botPath, 'dist'))) {
                        execSync(`rm -r dist`, {
                            stdio: [0, 1, 2],
                            cwd: botPath,
                        });
                    };
                    execSync(`git pull`, {
                        stdio: [0, 1, 2],
                        cwd: botPath,
                    });
                    execSync(`npx tsc`, {
                        stdio: [0, 1, 2],
                        cwd: botPath,
                    });
                    execSync(`mv dist/index.js dist/${result?.[i]?.[c]?.code}.js`, {
                        stdio: [0, 1, 2],
                        cwd: botPath,
                    });
                    execSync(`pm2 start dist/${result?.[i]?.[c]?.code}.js -f`, {
                        stdio: [0, 1, 2],
                        cwd: botPath,
                    });
                };
            }
        }
    };


    async Refresh(client: Client) {
        let result = await client.db.get("OWNIHRZ");
        let now = new Date().getTime();

        for (let i in result) {
            for (let c in result[i]) {
                if (!result[i][c].code || result[i][c].expired) break;
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
    }
}

export default OwnIHRZ