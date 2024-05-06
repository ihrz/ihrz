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

import config from "../../files/config.js";
import logger from "../logger.js";

import { OwnIhrzCluster, ClusterMethod } from "../functions/apiUrlParser.js";
import db from "../functions/DatabaseModel.js";
import { axios } from "../functions/axios.js";

import { Client } from "discord.js";

class OwnIHRZ {

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

    // Working
    async Refresh(client: Client) {
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
    async ShutDown(cluster_id: number, id_to_bot: string) {
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
    async PowerOn(cluster_id: number, id_to_bot: string) {
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
    async Delete(cluster_id: number, id_to_bot: string) {
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
        let table = db.table("OWNIHRZ")
        let ownihrzClusterData = await table.get("CLUSTER");

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
        return;
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

        return;
    };
}

export { OwnIHRZ }