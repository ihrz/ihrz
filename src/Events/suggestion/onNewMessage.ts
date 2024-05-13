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

import { Client, EmbedBuilder, Message } from 'discord.js';
import { generatePassword } from '../../core/functions/random.js';

import { BotEvent } from '../../../types/event';

export const event: BotEvent = {
    name: "messageCreate",
    run: async (client: Client, message: Message) => {

        if (!message.guild || message.author.bot || !message.channel) return;

        let data = await client.functions.getLanguageData(message.guild.id);

        let baseData = await client.db.get(`${message.guildId}.SUGGEST`);

        if (!baseData
            || baseData?.channel !== message.channel.id
            || baseData?.disable) return;

        let suggestionContent = '```' + message.content + '```';
        var suggestCode = generatePassword({ length: 12 });

        let suggestionEmbed = new EmbedBuilder()
            .setColor('#4000ff')
            .setTitle(`#${suggestCode}`)
            .setAuthor({
                name: data.event_suggestion_embed_author
                    .replace('${message.author.username}', message.author.username),
                iconURL: message.author.displayAvatarURL()
            })
            .setDescription(suggestionContent.toString())
            .setThumbnail((message.guild?.iconURL() as string))
            .setFooter({ text: client.user?.username!, iconURL: "attachment://icon.png" })
            .setTimestamp();

        message.delete();

        let args = message.content.split(' ');
        if (args.length < 5) return;

        let msg = await message.channel.send({
            content: `<@${message.author.id}>`,
            embeds: [suggestionEmbed],
            files: [{ attachment: await client.functions.image64(client.user?.displayAvatarURL()), name: 'icon.png' }]
        });

        await msg.react(client.iHorizon_Emojis.icon.Yes_Logo);
        await msg.react(client.iHorizon_Emojis.icon.No_Logo);

        await client.db.set(`${message.guildId}.SUGGESTION.${suggestCode}`,
            {
                author: message.author.id,
                msgId: msg.id
            }
        );

        return;
    },
};