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

import logger from "../logger.js";

import { Client } from 'pwss';
import { OwnIhrzCluster, ClusterMethod } from "../functions/apiUrlParser.js";
import { AxiosResponse, axios } from "../functions/axios.js";
import { Custom_iHorizon } from "../../../types/ownihrz.js";
import { ConfigData } from "../../../types/configDatad.js";

class OwnIHRZ {

    // Working
    async Startup_Cluster(client: Client) {
        var table_1 = client.db.table("OWNIHRZ");

        (await table_1.all()).forEach(owner_one => {
            var cluster_ownihrz = owner_one.value;

            for (let owner_id in cluster_ownihrz) {
                for (let bot_id in cluster_ownihrz[owner_id]) {
                    if (cluster_ownihrz[owner_id][bot_id].PowerOff || !cluster_ownihrz[owner_id][bot_id].Code) continue;

                    axios.get(
                        OwnIhrzCluster(
                            client.config,
                            parseInt(cluster_ownihrz[owner_id][bot_id].Cluster),
                            ClusterMethod.StartupContainer,
                            bot_id,
                        )
                    ).then(function (response: AxiosResponse) {
                        logger.log(response.data)
                    }).catch(function (error) { logger.err(error); });
                }
            };
        })
    };

    // Working
    async ShutDown(config: ConfigData, cluster_id: number, id_to_bot: string) {
        axios.get(
            OwnIhrzCluster(
                config,
                cluster_id,
                ClusterMethod.ShutdownContainer,
                id_to_bot,
            )
        ).then(function (response) {
            logger.log(response.data)
        }).catch(function (error) { logger.err(error); });
        return 0;
    };

    // Working
    async PowerOn(config: ConfigData, cluster_id: number, id_to_bot: string) {
        axios.get(
            OwnIhrzCluster(
                config,
                cluster_id,
                ClusterMethod.PowerOnContainer,
                id_to_bot,
            )
        ).then(function (response) {
            logger.log(response.data)
        }).catch(function (error) { logger.err(error); });
        return 0;
    };


    // Working
    async Delete(config: ConfigData, cluster_id: number, id_to_bot: string) {
        axios.get(
            OwnIhrzCluster(
                config,
                cluster_id,
                ClusterMethod.DeleteContainer,
                id_to_bot,
            )
        ).then(function (response) {
            logger.log(response.data)
        }).catch(function (error) { logger.err(error); });
        return 0;
    };

    // Working
    async QuitProgram(client: Client) {
        let table = client.db.table("OWNIHRZ")
        let ownihrzClusterData = await table.get("CLUSTER");

        if (client.config.core.shutdownClusterWhenStop) {
            for (let userId in ownihrzClusterData as any) {
                for (let botId in ownihrzClusterData[userId]) {
                    if (ownihrzClusterData[userId][botId].PowerOff || !ownihrzClusterData[userId][botId].Code) continue;
                    await axios.get(
                        OwnIhrzCluster(
                            client.config,
                            parseInt(ownihrzClusterData[userId][botId].Cluster),
                            ClusterMethod.ShutdownContainer,
                            botId,
                        )
                    ).then(function (response) {
                        logger.log(response.data)
                    }).catch(function (error) { logger.err(error); });
                }
            };
        }
        return;
    };

    async Change_Token(config: ConfigData, cluster_id: number, botId: string, bot_token: string) {
        axios.get(
            OwnIhrzCluster(config, cluster_id!, ClusterMethod.ChangeTokenContainer, botId, bot_token))
            .then(async () => {
            })
            .catch(error => {
                logger.err(error)
            });

        return;
    };

    async Create_Container(config: ConfigData, cluster_id: number, botData: Custom_iHorizon): Promise<AxiosResponse<any>> {
        return await axios.post(OwnIhrzCluster(config, cluster_id, ClusterMethod.CreateContainer),
            botData,
            {
                headers: {
                    'Accept': 'application/json'
                }
            });
    };

    async Active_Intents(token: string) {
        try {
            const response = await fetch("https://discord.com/api/v10/applications/@me", {
                method: "PATCH",
                headers: {
                    Authorization: "Bot " + token,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ flags: 565248 }),
            });
            return await response.json();

        } catch (err) {
            logger.err((err as unknown as string));
        }
    };

    async Get_Bot(discord_bot_token: string): Promise<AxiosResponse<any>> {
        return await axios.get('https://discord.com/api/v10/applications/@me', {
            headers: {
                Authorization: `Bot ${discord_bot_token}`
            }
        });
    };

}

export { OwnIHRZ }