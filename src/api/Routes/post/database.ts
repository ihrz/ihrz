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

import logger from '../../../core/logger.js';
import config from '../../../files/config.js';
import dbPromise from '../../../core/database.js';
import { Request, Response } from 'express';
import { QuickDB } from 'quick.db';

export default {
    type: 'post',
    name: 'database',
    apiPath: '/api/database',
    run: async (req: Request, res: Response) => {
        let { id, key, values, code } = req.body;
        let db = await dbPromise as QuickDB;

        if (code !== config.api.apiToken) {
            return res.send(500);
        };
        
        try {
            switch (id) {
                case 1:
                    await db.set(key, values);
                    res.sendStatus(200);
                    break;
                case 2:
                    await db.push(key, values);
                    res.sendStatus(200);
                    break;
                case 3:
                    await db.sub(key, values);
                    res.sendStatus(200);
                    break;
                case 4:
                    await db.add(key, values);
                    res.sendStatus(200);
                    break;
                case 5:
                    res.send({ r: await db.get(key) });
                    break;
                case 6:
                    await db.pull(key, values);
                    res.send(200);
                    break;
                case 7:
                    res.send({ r: await db.all() });
                    break;
                case 8:
                    await db.delete(key);
                    res.sendStatus(200);
                    break;
                default:
                    await res.sendStatus(403) && logger.warn(`${id} -> Bad json request without ip/key`);
                    break;
            };
        } catch (e: any) {
            res.sendStatus(403) && logger.warn(e);
            logger.warn("-> Bad json request without ip/key" + e);
            return;
        };
    },
};