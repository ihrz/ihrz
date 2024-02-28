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

import { URLSearchParams } from 'url';
import 'colors';
import logger from '../../../core/logger.js';
import config from '../../../files/config.js';
import * as apiUrlParser from '../../../core/functions/apiUrlParser.js';
import { Request, Response } from 'express';
import db from '../../../core/functions/DatabaseModel.js';

export default {
    type: 'post',
    apiPath: '/api/user',
    run: async (req: Request, res: Response) => {
        let data = new URLSearchParams();

        try {
            data.append('client_id', process.env.CLIENT_ID || config.api.clientID);
            data.append('client_secret', config.api.clientSecret);
            data.append('grant_type', 'authorization_code');
            data.append('redirect_uri', apiUrlParser.LoginURL);
            data.append('scope', 'identify');
            data.append('code', req.body["auth"]);

            let tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
                method: 'POST',
                body: data,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            let tokenData = await tokenResponse.json();
            let accessToken = tokenData.access_token;

            let userInfoResponse = await fetch('https://discord.com/api/users/@me', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            let userInfo = await userInfoResponse.json();

            if (!accessToken) {
                logger.warn(`${config.console.emojis.OK} >> Error Code 500`.gray);
                res.sendStatus(500);
                return;
            };

            logger.log(`${config.console.emojis.OK} >> ${userInfo.username} -> ${accessToken}`.green);

            await db.table('API').set(`${userInfo.id}`, { token: `${accessToken}` });

            res.status(200).send(userInfo);
            return;
        } catch (err) {
            res.sendStatus(500);
            return;
        }
    }
};
