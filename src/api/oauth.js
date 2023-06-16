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

const Express = require('express'),
    { URLSearchParams } = require('url'),
    axios = require('axios'),
    path = require('path'),
    bodyParser = require('body-parser'),
    fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const couleurmdr = require("colors"),
    api = require('./code/api'),
    logger = require(`${process.cwd()}/src/core/logger`),
    config = require(`${process.cwd()}/files/config`),
    code = require('./code/code'),
    DataBaseModel = require(`${process.cwd()}/files/ihorizon-api/main`),
    app = Express();

app.use(Express.urlencoded({ extended: false }));
app.use(Express.json());
app.use(bodyParser.text());
app.post('/api/check/', code);
if (config.database.useDatabaseAPI) { app.post('/api/database', api); };

function make_config(authorization_token) {
    data = { headers: { "authorization": `Bearer ${authorization_token}` } }; return data;
};

app.get('/', (_req, res) => { res.sendFile(path.join(__dirname + '/index.html')); });

app.post('/user', async (req, res) => {
    const data_1 = new URLSearchParams();

    try {

        data_1.append('client_id', config.api.clientID);
        data_1.append('client_secret', config.api.clientSecret);
        data_1.append('grant_type', 'authorization_code');
        data_1.append('redirect_uri', config.api.loginURL);
        data_1.append('scope', 'identify');
        data_1.append('code', req.body);

        await fetch('https://discord.com/api/oauth2/token', { method: "POST", body: data_1 })
            .then(response => response.json()).then(async data => {
                axios.get("https://discord.com/api/users/@me", make_config(data.access_token))
                    .then(async _response => {
                        let userinfo_raw = await fetch('https://discord.com/api/users/@me',
                            {
                                method: "get",
                                headers: { "Authorization": `Bearer ${data.access_token}` }
                            });

                        let userinfo = JSON.parse(await userinfo_raw.text());

                        logger.log(`${config.console.emojis.OK} >> ${userinfo.username}#${userinfo.discriminator} -> ${data.access_token}`);

                        if (!data.access_token) return logger.warn(`${config.console.emojis.OK} >> Error Code 500`.gray);

                        await DataBaseModel({ id: DataBaseModel.Set, key: `API.TOKEN.${userinfo.id}`, value: { token: `${data.access_token}` } });

                        return res.status(200).send(userinfo.username);
                    }).catch(_err => {
                        logger.warn(`${config.console.emojis.ERROR} >> Error Code 500`);
                        return res.sendStatus(500);
                    });
            });
    } catch (err) {
        logger.warn(`${config.console.emojis.ERROR} >> Error Code 500`);
        return res.sendStatus(500);
    }
});

app.listen(config.api.hostPort, async function () { await logger.log(`${config.console.emojis.HOST} >> App listening, link: (${config.api.loginURL})`.green); });