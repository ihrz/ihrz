/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2023 iHorizon
*/

import { Attachment, AttachmentData, Client, Collection, EmbedBuilder, GuildTextBasedChannel, Message, PermissionsBitField } from 'discord.js';
import * as hidden from '../core/functions/maskLink';
import * as db from '../core/functions/DatabaseModel';

export = async (client: Client, message: Message) => {
    let data = await client.functions.getLanguageData(message.guild?.id);

    async function snipeModules() {
        if (!message.guild || !message.author
            || message.author.id == client.user?.id) return;

        await db.DataBaseModel({
            id: db.Set, key: `${message.guild.id}.GUILD.SNIPE.${message.channel.id}`,
            value: {
                snipe: `${await hidden.maskLink(message.content)}`,
                snipeUserInfoTag: `${message.author.username} (${message.author.id} )`,
                snipeUserInfoPp: `${message.author.displayAvatarURL()}`,
                snipeTimestamp: Date.now()
            }
        });
    };

    async function serverLogs() {
        if (!message.guild || !message.author
            || message.author.id == client.user?.id) return;

        const guildId = message.guild.id;
        const someinfo = await db.DataBaseModel({ id: db.Get, key: `${guildId}.GUILD.SERVER_LOGS.message` });

        if (!someinfo) return;

        let Msgchannel: any = client.channels.cache.get(someinfo);
        let iconURL: any = message.author.avatarURL();
        if (!Msgchannel) return;

        let logsEmbed = new EmbedBuilder()
            .setColor("#000000")
            .setAuthor({
                name: message.author.username,
                iconURL: iconURL
            })
            .setDescription(data.event_srvLogs_messageDelete_description
                .replace("${message.channel.id}", message.channel.id)
                .replace("${message.content}", message.content)
            )
            .setTimestamp();

        if (message.attachments.size >= 1) {
            const attachments = message.attachments;
            const attachment = attachments.first();
            if (!attachment || !attachment.contentType) return;

            if (attachment && attachment.contentType.startsWith('image/')) {
                const imageUrl: any = attachment['attachment'];
                logsEmbed.setImage(imageUrl)
            }
        };

        await Msgchannel.send({ embeds: [logsEmbed] });
    };

    await snipeModules(), serverLogs();
};