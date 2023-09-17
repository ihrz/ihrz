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

import express, { Request, Response } from 'express';
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
import slap from './Routes/slap'
import publish from './Routes/publish'
import hug from './Routes/hug'
import kiss from './Routes/kiss'

import captcha from '../core/captcha';

let app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(bodyParser.text());

app.use('/assets/slap', express.static(`${process.cwd()}/src/assets/slap/`));
app.use('/assets/hug', express.static(`${process.cwd()}/src/assets/hug/`));
app.use('/assets/kiss', express.static(`${process.cwd()}/src/assets/kiss/`));

app.post('/api/check', code);
app.post('/api/user', user);
app.post('/api/publish', publish);

if (config.database.useDatabaseAPI) { app.post('/api/database', api); };

app.get('/api/slap', slap);
app.get('/api/hug', hug);
app.get('/api/kiss', kiss);

app.get("/api/captcha/:width?/:height?/", (req: Request, res: Response) => {
    let width = parseInt(req.params.width) || 200;
    let height = parseInt(req.params.height) || 100;
    let { image, text } = captcha(width, height);

    res.send({ image, text });
});

app.get('/', (_req, res) => {
    res.sendFile(`${process.cwd()}/src/api/index.html`)
});


if (config.api.useHttps) {
    let options = {
        key: fs.readFileSync(`${process.cwd()}/src/files/certificat.key`),
        cert: fs.readFileSync(`${process.cwd()}/src/files/certificat.crt`)
    };

    let server = https.createServer(options, app);

    server.listen(config.api.port, () => {
        logger.log(`${config.console.emojis.HOST} >> Secure App listening on "${config.api.port}".`);
    });
} else {
    app.listen(config.api.port, async function () {
        await logger.log(couleurmdr.green(`${config.console.emojis.HOST} >> Unsecure App listening on "${apiUrlParser.LoginURL}".`));
    });
};