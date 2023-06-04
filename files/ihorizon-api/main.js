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

const superagent = require('superagent'), 
    config = require('../config'),
    CryptoJS = require("crypto-js");

async function DataBaseModel(id) {
    return new Promise((resolve, reject) => {
        let encrypted = CryptoJS.AES.encrypt(JSON.stringify(id), config.api.apiToken);
        superagent
            .post(config.api.dbApiUrl)
            .send({ text: encrypted.toString() })
            .set('accept', 'json')
            .end((err, res) => {
                if (err) {
                    reject(err);
                } else {
                    if (JSON.stringify(res.body) === "{}") {
                        resolve(undefined);
                    } else {
                        resolve(res.body.r);
                    }
                }
            });
    });
};

module.exports = DataBaseModel;
module.exports.Set = 1;
module.exports.Push = 2;
module.exports.Sub = 3;
module.exports.Add = 4;
module.exports.Get = 5;
module.exports.Pull = 6;
module.exports.All = 7;
module.exports.Delete = 8;