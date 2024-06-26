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

import { Client, Message, SnowflakeUtil } from 'pwss';

import { BotEvent } from '../../../types/event';

export const event: BotEvent = {
    name: "messageCreate",
    run: async (client: Client, message: Message) => {
        /**
         * Why doing this?
         * On iHorizon Production, we have some ~problems~ 👎
         * All of the guildMemberAdd, guildMemberRemove sometimes emiting in double, triple, or quadruple.
         */
        const nonce = SnowflakeUtil.generate().toString();

        if (!message.guild || message.author.bot || !message.channel) return;

        if (!message.guild
            || message.author.bot
            || !message.channel
            || await client.db.get(`${message.guildId}.GUILD.GUILD_CONFIG.hey_reaction`) === false) return;

        let recognizeItem: Array<string> = [
            'hey',
            'salut',
            'coucou',
            'bonjour',
            'salem',
            'wesh',
            'hello',
            'bienvenue',
            'welcome',
        ];

        recognizeItem.forEach(content => {
            if (message.content.split(' ')[0]?.toLocaleLowerCase()
                .startsWith(content.toLocaleLowerCase())) {

                try {
                    message.react('👋');
                    return;
                } catch (e) {
                    return;
                };
            };
        });

        let custom_react = await client.db.get(`${message.guildId}.GUILD.REACT_MSG.${message.content.split(' ')[0]?.toLocaleLowerCase()}`)
        if (custom_react) await message.react(custom_react).catch(() => { });
        return;
    },
};