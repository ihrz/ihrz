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

import DiscordOauth2 from 'discord-oauth2';
import logger from '../../../core/logger';
import { Request, Response } from 'express';
import db from '../../../core/functions/DatabaseModel';
import config from '../../../files/config';

let oauth = new DiscordOauth2();

export = {
    type: 'post',
    apiPath: '/api/check',
    run: async (req: Request, res: Response) => {
        let { userid, tor, adminKey } = req.body;
        if (!userid || !adminKey) {
            logger.warn("-> Bad json request without ip/key");
            return;
        };

        if (tor == "CHECK_IN_SYSTEM") {
            let { userid, adminKey } = req.body;
            if (!userid || !adminKey) {
                logger.warn("-> Bad json request without ip/key");
                return;
            };

            if (adminKey != config.api.apiToken) return;
            let value = await db.get(`API.TOKEN.${userid}`);
            if (!value) {
                res.json({ available: "no", id: userid, adminKey: "ok" });
                return;
            };

            try {
                await oauth.getUser(value.token); res.json({ connectionToken: value.token, available: "yes", id: userid, adminKey: "ok" });
            } catch (e) {
                await db.delete(`API.TOKEN.${userid}`);

                return res.json({ available: "no", id: "deleted", adminKey: "ok" });
            };
            return;
        };
        logger.warn('-> Bad json requests without options');
        res.send('-> Bad json requests without options');
        return;
    },
};