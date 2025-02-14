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

import hidden from '../../core/functions/maskLink.js';

import { Client, Message } from 'discord.js';
import { BotEvent } from '../../../types/event.js';

export const event: BotEvent = {
    name: "messageDelete",
    run: async (client: Client, message: Message) => {

        if (!message.guild || !message.author
            || message.author.id == client.user?.id) return;

        if (message.content.length == 0) return;
        if (message.content === "") return;

        let message_content = hidden(message.content);

        await client.db.set(`${message.guildId}.GUILD.SNIPE.${message.channel.id}`,
            {
                snipe: message_content,
                snipeUserInfoTag: `${message.author.username} (${message.author.id})`,
                snipeUserInfoPp: `${message.author.displayAvatarURL()}`,
                snipeTimestamp: message.createdTimestamp
            }
        );

        await client.db.set(`${message.guildId}.GUILD.SNIPE.${message.channel.id}`,
            {
                snipe: message_content,
                snipeUserInfoTag: `${message.author.username} (${message.author.id})`,
                snipeUserInfoPp: `${message.author.displayAvatarURL()}`,
                snipeTimestamp: message.createdTimestamp
            }
        );
    },
};