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

import config from "../../files/config.js";

export const ClusterMethod = {
    CreateContainer: 0,
    DeleteContainer: 1,
    StartupContainer: 2,
    ShutdownContainer: 3,
    PowerOnContainer: 4
};

export let LoginURL =
    config.api.useProxy ? config.api.proxyUrl :
        config.api.useHttps ? 'https://' : 'http://' +
            config.api.domain + ':' + config.api.port;

export let ApiURL =
    config.api.useProxy ? config.api.proxyUrl + '/api/check/' :
        config.api.useHttps ? 'https://' : 'http://' +
            config.api.domain + ':' + config.api.port + '/api/check/';

export let DatabaseURL =
    config.api.useProxy ? config.api.proxyUrl + '/api/database/' :
        config.api.useHttps ? 'https://' : 'http://' +
            config.api.domain + ':' + config.api.port + '/api/database/';

export let CaptchaURL =
    config.api.useProxy ? config.api.proxyUrl + '/api/captcha/' :
        config.api.useHttps ? 'https://' : 'http://' +
            config.api.domain + ':' + config.api.port + '/api/captcha/';

export let KissURL =
    config.api.useProxy ? config.api.proxyUrl + '/api/kiss/' :
        config.api.useHttps ? 'https://' : 'http://' +
            config.api.domain + ':' + config.api.port + '/api/kiss/';

export let SlapURL =
    config.api.useProxy ? config.api.proxyUrl + '/api/slap/' :
        config.api.useHttps ? 'https://' : 'http://' +
            config.api.domain + ':' + config.api.port + '/api/slap/';

export let HugURL =
    config.api.useProxy ? config.api.proxyUrl + '/api/hug/' :
        config.api.useHttps ? 'https://' : 'http://' +
            config.api.domain + ':' + config.api.port + '/api/hug/';

export let assets =
    config.api.useProxy ? config.api.proxyUrl + '/assets/' :
        config.api.useHttps ? 'https://' : 'http://' +
            config.api.domain + ':' + config.api.port + '/assets/';

export let PublishURL =
    config.api.useProxy ? config.api.proxyUrl + '/api/publish' :
        config.api.useHttps ? 'https://' : 'http://' +
            config.api.domain + ':' + config.api.port + '/api/publish';

export function OwnIhrzCluster(cluster_number: number, cluster_method: number, bot_id?: string, admin_key?: string) {
    var data = config.core.cluster[cluster_number as keyof typeof config.core.cluster];

    data += "/api/instance/"
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
    }

    return data;
};