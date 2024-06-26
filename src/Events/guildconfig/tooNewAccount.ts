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

import { Client, GuildMember, SnowflakeUtil } from 'pwss';

import { BotEvent } from '../../../types/event';
import { DatabaseStructure } from '../../core/database_structure';

export const event: BotEvent = {
    name: "guildMemberAdd",
    run: async (client: Client, member: GuildMember) => {
        /**
         * Why doing this?
         * On iHorizon Production, we have some ~problems~ 👎
         * All of the guildMemberAdd, guildMemberRemove sometimes emiting in double, triple, or quadruple.
         */
        const nonce = SnowflakeUtil.generate().toString();

        if (!member.guild || member.user.bot) return;

        let baseData = await client.db.get(`${member.guild.id}.GUILD.BLOCK_NEW_ACCOUNT`) as DatabaseStructure.BlockNewAccountSchema;

        if (!baseData) return;

        const accountCreationDate = member.user.createdAt;
        const currentTime = Date.now();
        const accountAge = currentTime - accountCreationDate.getTime();

        if (accountAge < baseData.req) {
            try {
                member.kick("Account is too new")
                    .catch(() => { })
                    .then(() => { });
            } catch { }
        }
    },
};