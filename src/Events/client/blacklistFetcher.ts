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

import { Client, GuildMember } from 'discord.js';

import { BotEvent } from '../../../types/event';

export const event: BotEvent = {
    name: "guildMemberAdd",
    run: async (client: Client, member: GuildMember) => {

        try {
            let table = client.db.table('BLACKLIST')

            if (await table.get(`${member.user.id}.blacklisted`)) {
                member.send({ content: 'You\'ve been banned, because you are blacklisted' })
                    .catch(() => { })
                    .then(() => {
                        member.ban({ reason: 'blacklisted!' });
                    });
            }

        } catch (error) {
            return;
        }
    },
};