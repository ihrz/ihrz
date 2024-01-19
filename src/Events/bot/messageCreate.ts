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

import { Client, EmbedBuilder, PermissionsBitField, ChannelType, Message, GuildTextBasedChannel, ClientUser } from 'discord.js';

export default async (client: Client, message: Message) => {
    if (!message.guild || message.author.bot || !message.channel) return;

    let data = await client.functions.getLanguageData(message.guild.id);

    async function MessageCommandExecutor(): Promise<boolean> {
        var prefix = `<@${client.user?.id}>`;

        if (!message.guild || message.author.bot || !message.content.toString().startsWith(prefix)) return false;

        let args = message.content.slice(prefix.length).trim().split(/ +/g);
        let command = client.message_commands.get(args.shift()?.toLowerCase() as string);

        if (command) {
            command?.run(client, message, args);
            return true;
        } else {
            return false;
        };
    };

    async function xpFetcher() {
        if (await MessageCommandExecutor()) return;
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

            if (!xpChan) return message.channel.send({
                content: data.event_xp_level_earn
                    .replace("${message.author.id}", message.author.id)
                    .replace("${newLevel}", newLevel)
            }).catch(() => { });

            (client.channels.cache.get(xpChan) as GuildTextBasedChannel).send({
                content: data.event_xp_level_earn
                    .replace("${message.author.id}", message.author.id)
                    .replace("${newLevel}", newLevel)
            }).catch(() => { });

            return;
        }
    };

    async function suggestion() {
        let baseData = await client.db.get(`${message.guildId}.SUGGEST`);

        if (!baseData
            || baseData?.channel !== message.channel.id
            || baseData?.disable) return;

        let suggestionContent = '```' + message.content + '```';
        var suggestCode = Math.random().toString(36).slice(-8);

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
            .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() })
            .setTimestamp();

        message.delete();

        let args = message.content.split(' ');
        if (args.length < 5) return;

        let msg = await message.channel.send({
            content: `<@${message.author.id}>`,
            embeds: [suggestionEmbed]
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
    };

    async function reactToHeyMSG() {
        if (!message.guild
            || message.author.bot
            || !message.channel) return;

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
        return;
    };

    xpFetcher(), suggestion(), reactToHeyMSG();
};