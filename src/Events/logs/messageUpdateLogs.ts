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

import { BaseGuildTextChannel, Client, EmbedBuilder, Message } from 'discord.js';
import { BotEvent } from '../../../types/event';
import { LanguageData } from '../../../types/languageData';

function getDiff(oldText: string, newText: string): string {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');

    const diffLines = [];
    const maxLines = Math.max(oldLines.length, newLines.length);

    for (let i = 0; i < maxLines; i++) {
        const oldLine = oldLines[i] || '';
        const newLine = newLines[i] || '';

        if (oldLine !== newLine) {
            if (oldLine.trim() !== '') {
                diffLines.push(`- ${oldLine.trim().substring(0, 40)}...`);
            }
            if (newLine.trim() !== '') {
                diffLines.push(`+ ${newLine.trim().substring(0, 40)}...`);
            }
        }
    }

    return diffLines.join('\n');
}

export const event: BotEvent = {
    name: "messageUpdate",
    run: async (client: Client, oldMessage: Message, newMessage: Message) => {

        let data = await client.func.getLanguageData(oldMessage.guildId) as LanguageData;

        if (!oldMessage || !oldMessage.guild) return;

        if (!newMessage.author || newMessage.author.bot
            || oldMessage.content === '' || newMessage.content === '') return;

        let someinfo = await client.db.get(`${oldMessage.guildId}.GUILD.SERVER_LOGS.message`);

        if (!someinfo || oldMessage.content === newMessage.content) return;

        let Msgchannel = oldMessage.guild.channels.cache.get(someinfo);
        if (!Msgchannel) return;

        let icon = newMessage.author.displayAvatarURL();

        let logsEmbed = new EmbedBuilder()
            .setColor("#000000")
            .setAuthor({ name: newMessage.author.username, iconURL: icon })
            .setDescription(data.event_srvLogs_messageUpdate_description
                .replace("${oldMessage.channelId}", oldMessage.channelId)
                .replace("(xxx)", `(https://discord.com/channels/${oldMessage.guildId}/${oldMessage.channelId}/${oldMessage.id})`)
            );

        if (oldMessage.content.length > 160 || newMessage.content.length > 160) {
            const changes = getDiff(oldMessage.content, newMessage.content);
            logsEmbed.setFields(
                { name: data.var_message, value: `\`\`\`git\n${changes}\n\`\`\`` },
            );
        } else {
            logsEmbed.setFields(
                { name: data.event_srvLogs_messageUpdate_footer_1, value: oldMessage.content + '.' },
                { name: data.event_srvLogs_messageUpdate_footer_2, value: newMessage.content + '.' }
            );
        }

        logsEmbed.setTimestamp();

        await (Msgchannel as BaseGuildTextChannel).send({ embeds: [logsEmbed] }).catch(() => { });
    },
};
