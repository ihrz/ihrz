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

import config from "../../files/config";

export let LoginURL =
    config.api.useHttps ? 'https://' : 'http://' +
        config.api.domain + ':' + config.api.port;

export let ApiURL =
    config.api.useHttps ? 'https://' : 'http://' +
        config.api.domain + ':' + config.api.port + '/api/check/';

export let DatabaseURL =
    config.api.useHttps ? 'https://' : 'http://' +
        config.api.domain + ':' + config.api.port + '/api/database/';

export let CaptchaURL =
    config.api.useHttps ? 'https://' : 'http://' +
        config.api.domain + ':' + config.api.port + '/api/captcha/';

export let KissURL =
    config.api.useHttps ? 'https://' : 'http://' +
        config.api.domain + ':' + config.api.port + '/api/kiss/';

export let SlapURL =
    config.api.useHttps ? 'https://' : 'http://' +
        config.api.domain + ':' + config.api.port + '/api/slap/';

export let HugURL =
    config.api.useHttps ? 'https://' : 'http://' +
        config.api.domain + ':' + config.api.port + '/api/hug/';

export let assets =
    config.api.useHttps ? 'https://' : 'http://' +
        config.api.domain + ':' + config.api.port + '/assets/';