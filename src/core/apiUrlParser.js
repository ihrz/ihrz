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

/*
        // "apiURL": "http://localhost:1337/api/check/",

        // "loginURL": "http://localhost:1337",

        // "dbApiUrl": "http://localhost:1337/api/database/",
*/

const config = require(`${process.cwd()}/files/config`);

function parseLoginURL() {
    let url =
        config.api.useHttps ? 'https://' : 'http://' +
            config.api.domain + ':' + config.api.port;
    return url;
};

function parseDatabaseURL() {
    let url =
        config.api.useHttps ? 'https://' : 'http://' +
            config.api.domain + ':' + config.api.port + '/api/database/';
    return url;
}

function parseApiURL() {
    let url =
        config.api.useHttps ? 'https://' : 'http://' +
            config.api.domain + ':' + config.api.port + '/api/check/';
    return url;
}

module.exports.LoginURL = parseLoginURL;
module.exports.ApiURL = parseApiURL;
module.exports.DatabaseURL = parseDatabaseURL;