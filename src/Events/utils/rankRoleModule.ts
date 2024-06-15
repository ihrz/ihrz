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

import { Client, EmbedBuilder, PermissionsBitField, ChannelType, Message, ClientUser } from 'discord.js';
import { BotEvent } from '../../../types/event';
import { DatabaseStructure } from '../../core/database_structure';
import { LanguageData } from '../../../types/languageData';

export const event: BotEvent = {
    name: "messageCreate",
    run: async (client: Client, message: Message) => {

        if (!message.guild || message.author.bot || !message.channel) return;

        let data = await client.functions.getLanguageData(message.guild.id) as LanguageData;

        if (!message.guild || !message.channel || message.channel.type !== ChannelType.GuildText || message.author.bot
            || message.author.id === client.user?.id || !message.channel.permissionsFor((client.user as ClientUser))?.has(PermissionsBitField.Flags.SendMessages)
            || !message.channel.permissionsFor((client.user as ClientUser))?.has(PermissionsBitField.Flags.ManageRoles) || message.content !== `<@${client.user?.id}>`) return;

        let dbGet = await client.db.get(`${message.guild.id}.GUILD.RANK_ROLES`) as DatabaseStructure.DbGuildObject['RANK_ROLES'];

        if (!dbGet || !dbGet.roles) return;

        let fetch = message.guild.roles.cache.find((role) => role.id === dbGet.roles);

        if (fetch) {
            let target = message.guild.members.cache.get(message.author.id);
            if (target?.roles.cache.has(fetch.id)) return;

            if (dbGet.nicknames) {
                let includeUsername = message.author.username.includes(dbGet.nicknames);
                let includeGlobalname = message.author.globalName ? message.author.globalName.includes(dbGet.nicknames) : false;

                if (!includeUsername && !includeGlobalname) return;
            }

            let embed = new EmbedBuilder()
                .setDescription(data.event_rank_role
                    .replace("${message.author.id}", message.author.id)
                    .replace("${fetch.id}", fetch.id)
                )
                .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" })
                .setTimestamp();

            message.member?.roles.add(fetch).catch(() => { });
            message.channel.send({
                embeds: [embed],
                files: [{ attachment: await client.functions.image64(client.user?.displayAvatarURL()), name: 'icon.png' }]
            }).catch(() => { });
        }
    },
};
