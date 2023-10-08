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

import { Client, GuildChannel, GuildChannelManager, Message, MessageManager } from "discord.js";

import { Collection, EmbedBuilder, PermissionsBitField, AuditLogEvent, Events, GuildBan } from 'discord.js';



export = async (client: Client, ban: GuildBan) => {
    let data = await client.functions.getLanguageData(ban.guild.id);
    async function serverLogs() {
        if (!ban.guild.members.me
            || !ban.guild.members.me.permissions.has(PermissionsBitField.Flags.ViewAuditLog)) return;

        let fetchedLogs = await ban.guild.fetchAuditLogs({
            type: AuditLogEvent.MemberBanRemove,
            limit: 1,
        });

        var firstEntry: any = fetchedLogs.entries.first();
        let someinfo = await client.db.get(`${ban.guild.id}.GUILD.SERVER_LOGS.moderation`);

        if (!someinfo) return;

        let Msgchannel: any = client.channels.cache.get(someinfo);
        if (!Msgchannel) return;

        let logsEmbed = new EmbedBuilder()
            .setColor("#000000")
            .setDescription(data.event_srvLogs_banRemove_description
                .replace("${firstEntry.executor.id}", firstEntry.executor.id)
                .replace("${firstEntry.target.username}", firstEntry.target.username)
            )
            .setTimestamp();

        await Msgchannel.send({ embeds: [logsEmbed] }).catch(() => { });
    };
    serverLogs();
};