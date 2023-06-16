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
    app = Express(),
    path = require('path'),
    bodyParser = require('body-parser'),
    couleurmdr = require("colors"),
    logger = require(`${process.cwd()}/src/core/logger`),
    config = require(`${process.cwd()}/files/config`),
    code = require('./code/code'),
    user = require('./code/user'),
    api = require('./code/api');

app.use(Express.urlencoded({ extended: false }));
app.use(Express.json());
app.use(bodyParser.text());
app.post('/api/check/', code);
app.post('/user', user);

if (config.database.useDatabaseAPI) { app.post('/api/database', api); };

app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname + '/index.html'));
});

app.listen(config.api.hostPort, async function () {
    await logger.log(`${config.console.emojis.HOST} >> App listening, link: (${config.api.loginURL})`.green);
});