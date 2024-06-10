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

import { Assets } from "../../../types/assets.js";
import { ConfigData } from "../../../types/configDatad.js";

export const ClusterMethod = {
    CreateContainer: 0,
    DeleteContainer: 1,
    StartupContainer: 2,
    ShutdownContainer: 3,
    PowerOnContainer: 4,
    ChangeTokenContainer: 5,
};

export function assetsFinder(body: Assets, type: string): string {
    return `https://raw.githubusercontent.com/ihrz/assets/main/${type}/${Math.floor(Math.random() * body[type])}.gif`;
};

export function OwnIhrzCluster(config: ConfigData, cluster_number: number, cluster_method: number, bot_id?: string, discord_bot_token?: string): string {
    var data = config.core.cluster[cluster_number];
    var admin_key = config.api.apiToken;

    data += "/api/v1/instance/";
    switch (cluster_method) {
        case 0:
            data += "create"
            break;
        case 1:
            data += `delete`
            if (bot_id) data += `/${bot_id}`
            if (admin_key) data += `/${admin_key}`
            break;
        case 2:
            data += `startup`
            if (bot_id) data += `/${bot_id}`
            if (admin_key) data += `/${admin_key}`
            break;
        case 3:
            data += `shutdown`
            if (bot_id) data += `/${bot_id}`
            if (admin_key) data += `/${admin_key}`
            break;
        case 4:
            data += `poweron`
            if (bot_id) data += `/${bot_id}`
            if (admin_key) data += `/${admin_key}`
            break;
        case 5:
            data += `change_token`
            if (bot_id) data += `/${bot_id}`
            if (discord_bot_token) data += `/${discord_bot_token}`
            if (admin_key) data += `/${admin_key}`
            break;
    }

    return data;
};