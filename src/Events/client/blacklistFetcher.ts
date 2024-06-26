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

import { Client, GuildMember } from 'pwss';

import { BotEvent } from '../../../types/event';

export const event: BotEvent = {
    name: "guildMemberAdd",
    run: async (client: Client, member: GuildMember) => {

        try {
            let table = client.db.table('BLACKLIST')

            let data = await table.get(`${member.user.id}`);

            if (data.blacklisted === true) {
                member.send({ content: "You've been banned, because you are blacklisted ! \nReason: \`" + data.reason + '\`' })
                    .catch(() => { })
                    .then(() => { });
                member.ban({ reason: `iHorizon Project Punishement - Blacklist | Reason: ${data.reason}` })
                    .catch(() => { })
                    .then(() => { });
            }

        } catch (error) {
            return;
        }
    },
};