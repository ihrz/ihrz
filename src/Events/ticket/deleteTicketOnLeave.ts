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

import { Client, EmbedBuilder, GuildMember } from 'pwss'

import { LanguageData } from '../../../types/languageData';
import { BotEvent } from '../../../types/event';

export const event: BotEvent = {
    name: "guildMemberRemove",
    run: async (client: Client, member: GuildMember) => {

        let fetch = await client.db.get(`${member.guild.id}.TICKET_ALL.${member.user.id}`);

        for (let channelId in fetch) {
            let lang = await client.func.getLanguageData(member.guild.id) as LanguageData;
            let channel = member.guild.channels.cache.get(fetch[channelId].channel);
            await channel?.delete().catch(() => { });

            try {
                let TicketLogsChannel = await client.db.get(`${member.guild.id}.GUILD.TICKET.logs`);
                TicketLogsChannel = member.guild?.channels.cache.get(TicketLogsChannel);
                if (!TicketLogsChannel) return;

                let embed = new EmbedBuilder()
                    .setColor("#008000")
                    .setTitle(lang.event_ticket_logsChannel_onDelete_embed_title)
                    .setDescription(lang.event_ticket_logsChannel_onDelete_embed_desc
                        .replace('${interaction.user}', member.user.toString())
                        .replace('${interaction.channel.name}', channel?.name!)
                    )
                    .setFooter({ text: await client.func.displayBotName(member.guild.id), iconURL: "attachment://icon.png" })
                    .setTimestamp();

                TicketLogsChannel.send({ embeds: [embed], files: [{ attachment: await client.func.image64(client.user?.displayAvatarURL()), name: 'icon.png' }] });
            } catch (e) { };

            await client.db.delete(`${member.guild.id}.TICKET_ALL.${member.user.id}`)
        };
    },
};