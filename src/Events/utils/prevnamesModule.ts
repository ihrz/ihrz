/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import { Client, User, time } from 'pwss';

import { BotEvent } from '../../../types/event';

export const event: BotEvent = {
    name: "userUpdate",
    run: async (client: Client, oldUser: User) => {

        var newUser = await client.users.fetch(oldUser.id);

        let oldUsertag = oldUser.username;
        let oldUserGlbl = oldUser.globalName || oldUser.displayName;
        let table = client.db.table("PREVNAMES");

        if (!oldUser) return;

        if (oldUser.globalName !== newUser.globalName) {

            await table.push(`${oldUser.id}`, `${time((new Date()), 'd')} - ${oldUserGlbl}`);

        } else if (oldUser.username !== newUser.username) {

            await table.push(`${oldUser.id}`, `${time((new Date()), 'd')} - ${oldUsertag}`);
        };
    },
};