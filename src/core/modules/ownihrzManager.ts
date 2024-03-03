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

import { Custom_iHorizon } from "../../../types/ownihrz.js";
import { execSync } from 'child_process';
import config from "../../files/config.js";

import { OwnIhrzCluster, ClusterMethod } from "../functions/apiUrlParser.js";
import db from "../functions/DatabaseModel.js";
import { Client } from "discord.js";
import axios from "axios";
import logger from "../logger.js";
import path from "path";
import fs from 'node:fs';
import wait from "../functions/wait.js";

class OwnIHRZ {

    //Working
    async Create(data: Custom_iHorizon) {
        fs.mkdir(`${process.cwd()}/ownihrz/${data.Code}`, { recursive: true }, (err) => {
            if (err) throw err;
        });
        await wait(1000)

        let port_range = 29268;

        [
            {
                l: 'git clone --branch ownihrz --depth 1 https://github.com/ihrz/ihrz.git .',
                cwd: path.resolve(process.cwd(), 'ownihrz', data.Code)
            },

            {
                l: `yarn`,
                cwd: path.resolve(process.cwd(), 'ownihrz', data.Code)
            },

            {
                l: 'mv src/files/config.example.ts src/files/config.ts',
                cwd: path.resolve(process.cwd(), 'ownihrz', data.Code)
            },

            // The bot token
            {
                l: `sed -i 's/token: "The bot token"/token: "${data.Auth}"/' config.ts`,
                cwd: path.resolve(process.cwd(), 'ownihrz', data.Code, 'src', 'files')
            },

            // Owner1
            {
                l: `sed -i 's/ownerid1: "User id",/ownerid1: "${data.OwnerOne}",/' config.ts`,
                cwd: path.resolve(process.cwd(), 'ownihrz', data.Code, 'src', 'files')
            },

            // Owner2
            {
                l: `sed -i 's/ownerid2: "User id",/ownerid2: "${data.OwnerTwo}",/' config.ts`,
                cwd: path.resolve(process.cwd(), 'ownihrz', data.Code, 'src', 'files'),
            },

            // // ?
            // {
            //     l: `sed -i 's/"login\.example\.com"/"localhost"/' config.ts`,
            //     cwd: path.resolve(process.cwd(), 'ownihrz', data.Code, 'src', 'files')
            // },

            // ApiToken
            {
                l: `sed -i 's/apiToken: "The api token",/apiToken: "${config.api.apiToken}",/' config.ts`,
                cwd: path.resolve(process.cwd(), 'ownihrz', data.Code, 'src', 'files')
            },

            // UseProxy
            {
                l: `sed -i 's/useProxy: false/useProxy: true/' config.ts`,
                cwd: path.resolve(process.cwd(), 'ownihrz', data.Code, 'src', 'files')
            },

            // ProxyURL
            {
                l: `sed -i 's/proxyUrl: "https:\\/\\/login\\.domain\\.com"/proxyUrl: "https:\\/\\/srv\.ihorizon\\.me"/' config.ts`,
                cwd: path.resolve(process.cwd(), 'ownihrz', data.Code, 'src', 'files')
            },

            // ClientID
            {
                l: `sed -i 's/clientID: "The client id of your application"/clientID: "${process.env.CLIENT_ID || config.api.clientID}"/' config.ts`,
                cwd: path.resolve(process.cwd(), 'ownihrz', data.Code, 'src', 'files')
            },

            // Port
            {
                l: `sed -i 's/"3000"/"${port_range}"/' config.ts`,
                cwd: path.resolve(process.cwd(), 'ownihrz', data.Code, 'src', 'files')
            },

            // Blacklist
            {
                l: `sed -i 's/blacklistPictureInEmbed: "An png url",/blacklistPictureInEmbed: "https:\\/\\/media\\.discordapp\\.net\\/attachments\\/1099043567659384942\\/1119214828330950706\\/image\\.png",/' config.ts`,
                cwd: path.resolve(process.cwd(), 'ownihrz', data.Code, 'src', 'files')
            },

            // Lavalink
            {
                l: `sed -i 's/host: "lavalink.example.com"/host: "${data.Lavalink.NodeURL}"/' config.ts`,
                cwd: path.resolve(process.cwd(), 'ownihrz', data.Code, 'src', 'files')
            },

            // Lavalink
            {
                l: `sed -i 's/authorization: "password"/authorization: "${data.Lavalink.NodeAuth}"/' config.ts`,
                cwd: path.resolve(process.cwd(), 'ownihrz', data.Code, 'src', 'files')
            },

            // Compile
            {
                l: 'npx tsc',
                cwd: path.resolve(process.cwd(), 'ownihrz', data.Code)
            },

            // Moove file
            {
                l: `mv dist/index.js dist/${data.Code}.js`,
                cwd: path.resolve(process.cwd(), 'ownihrz', data.Code)
            },

            // Start
            {
                l: `pm2 start ./dist/${data.Code}.js -f`,
                cwd: path.resolve(process.cwd(), 'ownihrz', data.Code)
            }
        ].forEach((index) => {
            execSync(index.l, { stdio: [0, 1, 2], cwd: index.cwd })
        });

        let table_1 = db.table("OWNIHRZ");
        await table_1.set(`MAIN.${data.OwnerOne}.${data.Code}`,
            {
                Path: (path.resolve(process.cwd(), 'ownihrz', data.Code)) as string,
                Auth: data.Auth,
                OwnerOne: data.OwnerOne,
                OwnerTwo: data.OwnerTwo,
                Bot: data.Bot,
                ExpireIn: data.ExpireIn,
                Code: data.Code
            }
        );

        return 0;
    };

    // Working
    async Startup() {
        let table_1 = db.table("OWNIHRZ")
        let result = await table_1.get("MAIN");

        for (let owner_id in result) {
            for (let bot_id in result[owner_id]) {
                if (result[owner_id][bot_id].PowerOff || !result[owner_id][bot_id].Code) continue;
                let botPath = path.join(process.cwd(), 'ownihrz', result[owner_id][bot_id].Code);
                [
                    {
                        line: 'rm -r -f dist',
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
                        line: `mv dist/index.js dist/${result[owner_id][bot_id].Code}.js`,
                        cwd: botPath
                    },
                    {
                        line: `pm2 start dist/${result[owner_id][bot_id].Code}.js -f`,
                        cwd: botPath
                    },
                ].forEach((index) => { execSync(index.line, { stdio: [0, 1, 2], cwd: index.cwd }); })
            }
        }

        return 0;
    };

    // Working
    async Startup_Cluster() {
        var table_1 = db.table("OWNIHRZ");

        (await table_1.all()).forEach(owner_one => {
            var cluster_ownihrz = owner_one.value;

            for (let owner_id in cluster_ownihrz) {
                for (let bot_id in cluster_ownihrz[owner_id]) {
                    if (cluster_ownihrz[owner_id][bot_id].PowerOff || !cluster_ownihrz[owner_id][bot_id].Code) continue;

                    axios.get(
                        OwnIhrzCluster(
                            cluster_ownihrz[owner_id][bot_id].Cluster as unknown as number,
                            ClusterMethod.StartupContainer,
                            bot_id,
                            config.api.apiToken
                        ) as string
                    ).then(function (response) {
                        logger.log(response.data as unknown as string)
                    }).catch(function (error) { logger.err(error); });
                }
            };
        })
    };

    async Refresh(client: Client) {
        let table_1 = db.table("OWNIHRZ")
        let result = await table_1.get("MAIN");

        let now = new Date().getTime();

        for (let i in result) {
            for (let c in result[i]) {
                if (!result[i][c].Code || result[i][c].PowerOff) continue;
                if (now >= result[i][c].ExpireIn) {
                    await client.db.set(`OWNIHRZ.${i}.${c}.PowerOff`, true);

                    [
                        {
                            line: `pm2 stop ${result[i][c].Code} -f`,
                            cwd: process.cwd()
                        },
                        {
                            line: `pm2 delete ${result[i][c].Code}`,
                            cwd: process.cwd()
                        },
                    ].forEach((index) => { execSync(index.line, { stdio: [0, 1, 2], cwd: index.cwd }); });
                }
            }
        }

        return 0;
    };

    // Working
    async Refresh_Cluster(client: Client) {
        var tableOWNIHRZ = client.db.table("OWNIHRZ");
        let ownihrzClusterData = await tableOWNIHRZ.get("CLUSTER");

        let now = new Date().getTime();

        for (let userId in ownihrzClusterData as any) {
            for (let botId in ownihrzClusterData[userId]) {
                if (ownihrzClusterData[userId][botId].PowerOff || !ownihrzClusterData[userId][botId].Code) continue;

                if (now >= ownihrzClusterData[userId][botId].ExpireIn) {
                    await tableOWNIHRZ.set(`CLUSTER.${userId}.${botId}.PowerOff`, true);

                    axios.get(
                        OwnIhrzCluster(
                            ownihrzClusterData[userId][botId].Cluster as unknown as number,
                            ClusterMethod.ShutdownContainer,
                            botId,
                            config.api.apiToken
                        ) as string
                    ).then(function (response) {
                        logger.log(response.data as unknown as string)
                    }).catch(function (error) { logger.err(error); });
                };
            }
        };
    };

    // Working
    async ShutDown(id_to_bot: string) {
        [
            {
                line: `pm2 stop ${id_to_bot} -f`,
                cwd: process.cwd(),
            },
            {
                line: `pm2 delete ${id_to_bot}`,
                cwd: process.cwd(),
            },
        ].forEach((index) => { execSync(index.line, { stdio: [0, 1, 2], cwd: index.cwd }); });

        return 0;
    };

    // Working
    async ShutDown_Cluster(cluster_id: number, id_to_bot: string) {
        axios.get(
            OwnIhrzCluster(
                cluster_id,
                ClusterMethod.ShutdownContainer,
                id_to_bot,
                config.api.apiToken
            ) as string
        ).then(function (response) {
            logger.log(response.data as unknown as string)
        }).catch(function (error) { logger.err(error); });
        return 0;
    };

    // Working
    async PowerOn(id_to_bot: string) {

        execSync(`pm2 start ./dist/${id_to_bot}.js -f`, {
            stdio: [0, 1, 2],
            cwd: path.join(process.cwd(), 'ownihrz', id_to_bot),
        });

        return 0;
    };

    // Working
    async PowerOn_Cluster(cluster_id: number, id_to_bot: string) {
        axios.get(
            OwnIhrzCluster(
                cluster_id,
                ClusterMethod.PowerOnContainer,
                id_to_bot,
                config.api.apiToken
            ) as string
        ).then(function (response) {
            logger.log(response.data as unknown as string)
        }).catch(function (error) { logger.err(error); });
        return 0;
    };

    // Working
    async Delete(id_to_bot: string) {
        [
            {
                line: `pm2 stop ${id_to_bot} -f`,
                cwd: process.cwd()
            },
            {
                line: `pm2 delete ${id_to_bot}`,
                cwd: process.cwd()
            },
            {
                line: `rm -r --interactive=never ${id_to_bot}`,
                cwd: path.join(process.cwd(), 'ownihrz')
            },
        ].forEach((index) => { execSync(index.line, { stdio: [0, 1, 2], cwd: index.cwd }); });
        return 0;
    };

    // Working
    async Delete_Cluster(cluster_id: number, id_to_bot: string) {
        axios.get(
            OwnIhrzCluster(
                cluster_id,
                ClusterMethod.DeleteContainer,
                id_to_bot,
                config.api.apiToken
            ) as string
        ).then(function (response) {
            logger.log(response.data as unknown as string)
        }).catch(function (error) { logger.err(error); });
        return 0;
    };

    // Working
    async QuitProgram() {
        let table_1 = db.table("OWNIHRZ")
        let dataMain = await table_1.get("MAIN");
        let ownihrzClusterData = await table_1.get("CLUSTER");

        for (let i in dataMain) {
            for (let c in dataMain[i]) {
                if (i !== 'TEMP' && !dataMain[i][c].PowerOff) {
                    let botPath = path.join(process.cwd(), 'ownihrz', dataMain[i][c].Code);

                    execSync(`pm2 stop ${dataMain[i][c].Code}`, {
                        stdio: [0, 1, 2],
                        cwd: botPath,
                    });
                };
            }
        };

        if (config.core.shutdownClusterWhenStop) {
            for (let userId in ownihrzClusterData as any) {
                for (let botId in ownihrzClusterData[userId]) {
                    if (ownihrzClusterData[userId][botId].PowerOff || !ownihrzClusterData[userId][botId].Code) continue;
                    await axios.get(
                        OwnIhrzCluster(
                            ownihrzClusterData[userId][botId].Cluster as unknown as number,
                            ClusterMethod.ShutdownContainer,
                            botId,
                            config.api.apiToken
                        ) as string
                    ).then(function (response) {
                        logger.log(response.data as unknown as string)
                    }).catch(function (error) { logger.err(error); });
                }
            };
        }
        return 0;
    };

    async Change_Token(cluster_id: number, id_to_bot: string, bot_token: string) {
        axios.post(
            OwnIhrzCluster(
                cluster_id,
                ClusterMethod.ChangeTokenContainer,
            ) as string,
            {
                Auth: bot_token,
                Code: id_to_bot,
                AdminKey: config.api.apiToken
            }
        ).then(function (response) {
            logger.log(response.data as unknown as string);
        })
        .catch(function (error) {
            logger.err(error);
        });

        return 0;
    };
}

export { OwnIHRZ }