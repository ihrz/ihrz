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

import { OwnIHRZ } from '../../../core/ownihrzManager.js';
import config from '../../../files/config.js';

import { Request, Response } from 'express';
import wait from 'wait';
import fs from 'fs';

export default {
    type: 'post',
    apiPath: '/api/publish',
    run: async (req: Request, res: Response) => {

        let {
            admin_key,
            auth,
            owner_one,
            owner_two,
            bot,
            expireIn,
            code
        } = req.body;

        if (
            !auth
            || !owner_one
            || !owner_two
            || !expireIn
            || !bot
            || !code
            || config.api.apiToken !== admin_key) {

            res.sendStatus(500);
            return;
        };

        await fs.mkdir(`${process.cwd()}/ownihrz/${code}`, { recursive: true }, (err) => {
            if (err) throw err;
        });
        await wait(1000)

        return new OwnIHRZ().Create({
            Auth: auth,
            AdminKey: admin_key,
            OwnerOne: owner_one,
            OwnerTwo: owner_two,
            Bot: {
                ID: bot.id,
                Name: bot.username,
                Public: bot.public
            },
            ExpireIn: expireIn,
            Code: code
        });
    },
};