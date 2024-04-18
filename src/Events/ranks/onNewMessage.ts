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

import { Client, PermissionsBitField, ChannelType, Message, GuildTextBasedChannel, ClientUser } from 'discord.js';

import { isMessageCommand } from '../interaction/messageCommandHandler.js';
import { BotEvent } from '../../../types/event';

export const event: BotEvent = {
    name: "messageCreate",
    run: async (client: Client, message: Message) => {

        if (!message.guild || message.author.bot || !message.channel) return;

        let data = await client.functions.getLanguageData(message.guild.id);

        if ((await isMessageCommand(client, message.content)).s) return;

        if (!message.guild || message.author.bot || message.channel.type !== ChannelType.GuildText) return;

        var baseData = await client.db.get(`${message.guild.id}.USER.${message.author.id}.XP_LEVELING`);
        var xpTurn = await client.db.get(`${message.guild.id}.GUILD.XP_LEVELING.disable`);

        if (xpTurn === 'disable') return;

        var xp = baseData?.xp;
        var level = baseData?.level || 1;
        var randomNumber = Math.floor(Math.random() * 100) + 50;

        await client.db.add(`${message.guild.id}.USER.${message.author.id}.XP_LEVELING.xp`, randomNumber);
        await client.db.add(`${message.guild.id}.USER.${message.author.id}.XP_LEVELING.xptotal`, randomNumber);

        if ((level * 500) < xp) {
            await client.db.add(`${message.guild.id}.USER.${message.author.id}.XP_LEVELING.level`, 1);
            await client.db.add(`${message.guild.id}.USER.${message.author.id}.ECONOMY.money`, randomNumber);

            await client.db.sub(`${message.guild.id}.USER.${message.author.id}.XP_LEVELING.xp`, (level * 500));

            let newLevel = await client.db.get(`${message.guild.id}.USER.${message.author.id}.XP_LEVELING.level`);

            if (xpTurn === false
                || !message.channel.permissionsFor((client.user as ClientUser))?.has(PermissionsBitField.Flags.SendMessages)) return;

            let xpChan = await client.db.get(`${message.guild.id}.GUILD.XP_LEVELING.xpchannels`);
            let MsgChannel = message.guild.channels.cache.get(xpChan) as GuildTextBasedChannel;

            if (!xpChan) {
                message.channel.send({
                    content: data.event_xp_level_earn
                        .replace("${message.author.id}", message.author.id)
                        .replace("${newLevel}", newLevel)
                })
                return;
            }

            MsgChannel.send({
                content: data.event_xp_level_earn
                    .replace("${message.author.id}", message.author.id)
                    .replace("${newLevel}", newLevel)
            });
            return;
        }
    },
};