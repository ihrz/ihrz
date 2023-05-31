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
