/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import { Command } from '../../../types/command.js';
import { BotEvent } from '../../../types/event.js';
import { Client, Message, TextChannel } from 'discord.js';

interface LinkedChannelStructure {
    channels: { to_lang: string; in: string; out: string; }[]
}
export const event: BotEvent = {
    name: "messageCreate",
    run: async (client: Client, message: Message) => {

        // if (!message.guild || message.author.bot || !message.channel) return;
        // //  await client.db.get(`${message.guildId}.GUILD.LINKED_CHANNEL`)
        // let baseData = { channels: [{ to_lang: "fr", in: message.channel.id, out: "1257295087948271697" }] } as LinkedChannelStructure;
        // var get = baseData.channels.find(x => x.in === message.channel.id);
        // if (!get) return;

        // let chan = message.guild.channels.cache.get(get.out) as TextChannel | null;
        // let wb = await (chan)?.fetchWebhooks();
        // var nWb;

        // if (wb?.size === 0) {
        //     nWb = await chan?.createWebhook({
        //         name: "iHorizon MultiChannel Sending",
        //         avatar: client.user?.avatarURL({ size: 1024 })
        //     })
        // } else {
        //     nWb = wb?.first()
        // };

        // let attachment = message.attachments;
        // let attachmentToSend: { name: string; attachment: string }[] = [];

        // attachment.forEach((index, value) => {
        //     attachmentToSend.push({ name: index.name, attachment: index.url })
        // })

        // await nWb?.send({
        //     content: message.content,
        //     embeds: message.embeds,
        //     components: message.components,
        //     files: attachmentToSend,
        //     username: message.author.globalName || message.author.displayName,
        //     avatarURL: message.member?.avatarURL({ size: 1024 }) || message.author.avatarURL({ size: 1024 })!
        // })
    },
};