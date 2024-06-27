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

import { BaseGuildTextChannel, Client, EmbedBuilder, Message } from 'pwss';

import { BotEvent } from '../../../types/event';
import { LanguageData } from '../../../types/languageData';

export const event: BotEvent = {
    name: "messageUpdate",
    run: async (client: Client, oldMessage: Message, newMessage: Message) => {

        let data = await client.func.getLanguageData(oldMessage.guildId) as LanguageData;

        if (!oldMessage || !oldMessage.guild) return;

        if (!newMessage.author || newMessage.author.bot
            || oldMessage.content == '' || !oldMessage.content
            || newMessage.content == '' || !newMessage.content) return;

        let someinfo = await client.db.get(`${oldMessage.guildId}.GUILD.SERVER_LOGS.message`);

        if (!someinfo || !oldMessage.content || !newMessage.content
            || oldMessage.content === newMessage.content) return;

        let Msgchannel = client.channels.cache.get(someinfo);
        if (!Msgchannel) return;

        let icon = newMessage.author.displayAvatarURL();

        let logsEmbed = new EmbedBuilder()
            .setColor("#000000")
            .setAuthor({ name: newMessage.author.username, iconURL: icon })
            .setDescription(data.event_srvLogs_messageUpdate_description
                .replace("${oldMessage.channelId}", oldMessage.channelId)
                .replace("(xxx)", `(https://discord.com/channels/${oldMessage.guildId}/${oldMessage.channelId}/${oldMessage.id})`)
            )
            .setFields(
                { name: data.event_srvLogs_messageUpdate_footer_1, value: oldMessage.content + '.' },
                { name: data.event_srvLogs_messageUpdate_footer_2, value: newMessage.content + '.' }
            )
            .setTimestamp();

        await (Msgchannel as BaseGuildTextChannel).send({ embeds: [logsEmbed] }).catch(() => { });
    },
};