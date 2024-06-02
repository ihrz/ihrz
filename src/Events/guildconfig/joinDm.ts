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

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, GuildMember } from 'discord.js';
import { BotEvent } from '../../../types/event';

const processedMembers = new Set<string>();

export const event: BotEvent = {
    name: "guildMemberAdd",
    run: async (client: Client, member: GuildMember) => {
        /**
         * Why doing this?
         * On iHorizon Production, we have some ~discord.js problems~ 👎
         * All of the guildMemberAdd, guildMemberRemove sometimes emiting in double, triple, or quadruple.
         * As always, fuck discord.js
         */
        if (processedMembers.has(member.id)) return;
        processedMembers.add(member.id);
        setTimeout(() => processedMembers.delete(member.id), 7000);

        try {
            let msg_dm = await client.db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.joindm`)
            if (!msg_dm || msg_dm === "off") return;

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
                ]
            });
        } catch { return; };
    },
};