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

import { Client, Message, SnowflakeUtil } from 'discord.js';

import { BotEvent } from '../../../types/event.js';

export const event: BotEvent = {
    name: "messageCreate",
    run: async (client: Client, message: Message) => {
        if (!message.guild
            || message.author.bot
            || !message.channel
            || await client.db.get(`${message.guildId}.GUILD.GUILD_CONFIG.hey_reaction`) === false) return;

        const recognizeItems: string[] = [
            'hey', 'salut', 'coucou', 'bonjour', 'salem', 'wesh',
            'hello', 'bienvenue', 'welcome', 'hi'
        ];
        const customReacts = await client.db.get<{ [msg: string]: string }>(`${message.guildId}.GUILD.REACT_MSG`);
        const firstWord = message.content.split(' ')[0]?.toLowerCase();

        if (customReacts) {
            const react = Object.keys(customReacts).find(r => message.content.toLowerCase().includes(r));
            if (react) {
                await message.react(customReacts[react]).catch(() => { });
            }
        }

        if (firstWord && recognizeItems.some(item => firstWord.startsWith(item.toLowerCase()))) {
            await message.react('👋').catch(() => { });
        }
    },
};
