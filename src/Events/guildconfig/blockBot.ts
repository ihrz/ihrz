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

import { AuditLogEvent, Client, EmbedBuilder, GuildMember, PermissionsBitField } from 'pwss';
import { BotEvent } from '../../../types/event';

export const event: BotEvent = {
    name: "guildMemberAdd",
    run: async (client: Client, member: GuildMember) => {

        let data = await client.db.get(`${member.guild.id}.GUILD.BLOCK_BOT`) || false;

        if (!member.guild.members.me?.permissions.has([
            PermissionsBitField.Flags.Administrator
        ])) return;

        let fetchedLogs = await member.guild.fetchAuditLogs({
            type: AuditLogEvent.BotAdd,
        });

        let filteredLog = fetchedLogs.entries.filter(x => x.targetId === member.id).first();

        if (data === true && member.user.bot && filteredLog?.executorId !== member.guild.ownerId) {
            await member.ban({ reason: 'The BlockBot function are enable!' });

            let executor = member.guild.members.cache.get(filteredLog?.executorId!);

            await executor?.roles.set([], "Attempt to add an discord bot into this guild! -> Derank");
            let owner = member.guild.members.cache.get(member.guild.ownerId);
            let embed = new EmbedBuilder()
                .setColor(2829617)
                .setTitle(`⚠️ Danger in ${member.guild.name} ⚠️`)
                .setDescription(`# PunishPub Warning\nSomeone have try to add discord bot.`)
                .setFields(
                    { name: "User", value: filteredLog?.executor?.toString() || '`Not detected`', inline: true },
                    { name: "Target bot", value: member.toString(), inline: true },
                )
                .setTimestamp()
                .setFooter({ text: await client.func.displayBotName(member.guild.id), iconURL: "attachment://icon.png" });

            owner?.send({ embeds: [embed] })
                .catch(() => { })
                .then(() => { });
        };
    },
};