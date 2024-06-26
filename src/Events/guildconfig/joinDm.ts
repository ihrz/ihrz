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

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, GuildMember, SnowflakeUtil } from 'pwss';
import { BotEvent } from '../../../types/event';

export const event: BotEvent = {
    name: "guildMemberAdd",
    run: async (client: Client, member: GuildMember) => {
        try {
            let msg_dm = await client.db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.joindm`)
            if (!msg_dm || msg_dm === "off") return;

            /**
             * Why doing this?
             * On iHorizon Production, we have some ~problems~ 👎
             * All of the guildMemberAdd, guildMemberRemove sometimes emiting in double, triple, or quadruple.
             */
            const nonce = SnowflakeUtil.generate().toString();

            msg_dm = msg_dm
                .replaceAll("{memberUsername}", member.user.username)
                .replaceAll("{memberMention}", member.user.toString())
                .replaceAll('{memberCount}', member.guild?.memberCount.toString()!)
                .replaceAll('{createdAt}', member.user.createdAt.toDateString())
                .replaceAll('{guildName}', member.guild?.name!)

            let button = new ButtonBuilder()
                .setDisabled(true)
                .setCustomId('join-dm-from-server')
                .setStyle(ButtonStyle.Secondary)
                .setLabel('Message from ' + member.guild.id);

            member.send({
                content: msg_dm,
                components: [
                    new ActionRowBuilder<ButtonBuilder>().addComponents(button)
                ],
                enforceNonce: true,
                nonce: nonce
            })
                .catch(() => { })
                .then(() => { });
        } catch { return; };
    },
};