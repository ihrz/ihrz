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

import { BaseGuildTextChannel, Client, EmbedBuilder, PermissionsBitField, AuditLogEvent, GuildBan } from 'discord.js';

import { BotEvent } from '../../../types/event';
import { LanguageData } from '../../../types/languageData';

export const event: BotEvent = {
    name: "guildBanAdd",
    run: async (client: Client, ban: GuildBan) => {

        let data = await client.functions.getLanguageData(ban.guild.id) as LanguageData;

        if (!ban.guild.members.me || !ban.guild.members.me.permissions.has([
            PermissionsBitField.Flags.ViewAuditLog,
            PermissionsBitField.Flags.ManageGuild
        ])) return;
        let fetchedLogs = await ban.guild.fetchAuditLogs({
            type: AuditLogEvent.MemberBanAdd,
            limit: 1,
        });

        var firstEntry = fetchedLogs.entries.first();
        let someinfo = await client.db.get(`${ban.guild.id}.GUILD.SERVER_LOGS.moderation`);

        if (!someinfo) return;

        let Msgchannel = ban.guild.channels.cache.get(someinfo);
        if (!Msgchannel) return;

        let logsEmbed = new EmbedBuilder()
            .setColor("#000000")
            .setDescription(data.event_srvLogs_banAdd_description
                .replace("${firstEntry.executor.id}", firstEntry?.executor?.id!)
                .replace("${firstEntry.target.id}", firstEntry?.target?.id!)
            )
            .addFields({
                name: data.event_srvLogs_banAdd_fields_name,
                value: data.event_srvLogs_banAdd_fields_value.replace('{reason}', firstEntry?.reason || data.blacklist_var_no_reason)
            })
            .setTimestamp();

        await (Msgchannel as BaseGuildTextChannel).send({ embeds: [logsEmbed] }).catch(() => { });
    },
};