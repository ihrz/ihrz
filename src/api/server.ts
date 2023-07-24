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

import express from 'express';
import https from 'https';
import bodyParser from 'body-parser';
import couleurmdr from 'colors';
import logger from '../core/logger';
import config from '../files/config';
import fs from 'fs';
import * as apiUrlParser from '../core/functions/apiUrlParser';

import user from './Routes/user';
import code from './Routes/code';
import api from './Routes/api';

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(bodyParser.text());
app.post('/api/check', code);
app.post('/user', user);

if (config.database.useDatabaseAPI) { app.post('/api/database', api); };

app.get('/', (_req, res) => {
    res.sendFile(`${process.cwd()}/src/api/index.html`)
});

if (config.api.useHttps) {
    const options = {
        key: fs.readFileSync(`${process.cwd()}/files/certificat.key`),
        cert: fs.readFileSync(`${process.cwd()}/files/certificat.crt`)
    };

    const server = https.createServer(options, app);

    server.listen(config.api.port, () => {
        logger.log(`Serveur HTTPS démarré sur le port ${config.api.port}`);
    });
} else {
    app.listen(config.api.port, async function () {
        await logger.log(couleurmdr.green(`${config.console.emojis.HOST} >> App listening, link: (${apiUrlParser.LoginURL()})`));
    });
};