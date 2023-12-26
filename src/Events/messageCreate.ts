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

import { Client, Collection, EmbedBuilder, PermissionsBitField, ChannelType, Message, Role, GuildTextBasedChannel, ClientUser } from 'discord.js';

export = async (client: Client, message: Message) => {
    if (!message.guild || message.author.bot || !message.channel) return;

    let data = await client.functions.getLanguageData(message.guild.id);

    async function xpFetcher() {
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

    async function blockSpam() {

        if (!message.guild || !message.channel || !message.member
            || message.channel.type !== ChannelType.GuildText || message.author.bot
            || message.author.id === client.user?.id) {
            return;
        };

        let type = await client.db.get(`${message.guild.id}.GUILD.GUILD_CONFIG.antipub`);

        if (type === "off" || message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return;
        };

        let member = message.guild.members.cache.get(message.author.id);

        if (type === "on") {
            let LOG = await client.db.get(`${message.guild.id}.GUILD.PUNISH.PUNISH_PUB`);
            let LOGfetched = await client.db.get(`TEMP.${message.guild.id}.PUNISH_DATA.${message.author.id}`);

            if (LOG?.amountMax === LOGfetched?.flags && LOG?.state === "true") {
                switch (LOG.punishementType) {
                    case 'ban':
                        message.guild.members.ban(message.author, { reason: "Ban by PUNISHPUB" }).catch(() => { });
                        break;
                    case 'kick':
                        message.guild.members.kick(message.author).catch(() => { });
                        break;
                    case 'mute':
                        let muterole = message.guild.roles.cache.find((role: { name: string; }) => role.name === 'muted');

                        if (muterole) {
                            await member?.roles.add(muterole.id).catch();
                            setTimeout(async () => {
                                if (!muterole?.id) return;

                                if (member?.roles.cache.has(muterole.id)) {
                                    member.roles.remove(muterole.id);
                                }
                                await client.db.set(`TEMP.${message.guildId}.PUNISH_DATA.${message.author.id}`, {});
                            }, 40000);
                        }
                        break;
                }
            };

            try {
                let blacklist = ["https://", "http://", "://", ".com", ".xyz", ".fr", "www.", ".gg", "g/", ".gg/", "youtube.be", "/?"];
                let contentLower = message.content.toLowerCase();

                for (let word of blacklist) {
                    if (contentLower.includes(word)) {
                        let FLAGS_FETCH = await client.db.get(`TEMP.${message.guild.id}.PUNISH_DATA.${message.author.id}.flags`);
                        FLAGS_FETCH = FLAGS_FETCH || 0;

                        await client.db.set(`TEMP.${message.guild.id}.PUNISH_DATA.${message.author.id}`, { flags: FLAGS_FETCH + 1 });

                        await message.delete();
                        break;
                    }
                }
            } catch (e: any) {
                return;
            }
        }
    };

    async function rankRole() {
        if (!message.guild || !message.channel || message.channel.type !== ChannelType.GuildText || message.author.bot
            || message.author.id === client.user?.id || !message.channel.permissionsFor((client.user as ClientUser))?.has(PermissionsBitField.Flags.SendMessages)
            || !message.channel.permissionsFor((client.user as ClientUser))?.has(PermissionsBitField.Flags.ManageRoles) || message.content !== `<@${client.user?.id}>`) return;

        let dbGet = await client.db.get(`${message.guild.id}.GUILD.RANK_ROLES.roles`);
        let fetch = message.guild.roles.cache.find((role) => role.id === dbGet);

        if (fetch) {
            let target = message.guild.members.cache.get(message.author.id);
            if (target?.roles.cache.has(fetch.id)) { return; };

            let embed = new EmbedBuilder()
                .setDescription(data.event_rank_role
                    .replace("${message.author.id}", message.author.id)
                    .replace("${fetch.id}", fetch.id)
                )
                .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() })
                .setTimestamp();

            message.member?.roles.add(fetch).catch(() => { });
            message.channel.send({ embeds: [embed] }).catch(() => { });
            return;
        };
    };

    async function createAllowList() {
        let baseData = await client.db.get(`${message.guildId}.ALLOWLIST`);

        if (!baseData) {
            await client.db.set(`${message.guildId}.ALLOWLIST`,
                {
                    enable: false,
                    list: { [`${message.guild?.ownerId}`]: { allowed: true } },
                }
            );
            return;
        };
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

    xpFetcher(), blockSpam(), rankRole(), createAllowList(), suggestion(), reactToHeyMSG();
};