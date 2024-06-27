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

import { EmbedBuilder, PermissionsBitField, AuditLogEvent, Client, GuildMember, BaseGuildTextChannel } from 'pwss';

import { BotEvent } from '../../../types/event';
import { LanguageData } from '../../../types/languageData';

export const event: BotEvent = {
    name: "guildMemberUpdate",
    run: async (client: Client, oldMember: GuildMember, newMember: GuildMember) => {

        let data = await client.func.getLanguageData(newMember.guild.id) as LanguageData;

        if (!newMember.guild.members.me?.permissions.has([
            PermissionsBitField.Flags.ViewAuditLog,
            PermissionsBitField.Flags.ManageGuild
        ])) return;

        let fetchedLogs = await newMember.guild.fetchAuditLogs({
            type: AuditLogEvent.MemberRoleUpdate,
            limit: 1,
        });

        let firstEntry = fetchedLogs.entries.first();

        if (!firstEntry
            || firstEntry.executorId == client.user?.id
            || firstEntry.targetId !== newMember.user.id
        ) return;

        let someinfo = await client.db.get(`${newMember.guild.id}.GUILD.SERVER_LOGS.roles`);
        let Msgchannel = client.channels.cache.get(someinfo);

        if (!someinfo || !Msgchannel) return;

        interface CustomObject {
            id: string;
        }

        let newObjects: CustomObject[] = [];
        let removeObjects: CustomObject[] = [];

        firstEntry.changes.forEach((item) => {
            if (item.key === '$add') {
                newObjects.push(...<CustomObject[]>item.new);
            } else if (item.key === '$remove') {
                removeObjects.push(...<CustomObject[]>item.new);
            }
        });

        let newObjectsnewObjectIds: string[] = newObjects.map((obj) => obj.id);
        let removeObjectIds: string[] = removeObjects.map((obj) => obj.id);

        let logsEmbed = new EmbedBuilder()
            .setColor("#000000")
            .setAuthor({ name: firstEntry.target?.username as string, iconURL: firstEntry.target?.displayAvatarURL({ extension: 'png', forceStatic: false, size: 512 }) })
            .setTimestamp();

        let desc = ' ';

        if (removeObjects.length >= 1) {
            desc += data.event_srvLogs_guildMemberUpdate_description
                .replace("${firstEntry.executor.id}", firstEntry.executor?.id!)
                .replace("${removedRoles}", removeObjectIds.map(value => `<@&${value}>`).toString())
                .replace("${oldMember.user.username}", firstEntry.target?.username!) + '\n';
        };

        if (newObjects.length >= 1) {
            desc += data.event_srvLogs_guildMemberUpdate_2_description
                .replace("${firstEntry.executor.id}", firstEntry.executor?.id!)
                .replace("${addedRoles}", newObjectsnewObjectIds.map(value => `<@&${value}>`).toString())
                .replace("${oldMember.user.username}", firstEntry.target?.username!);
        };
        logsEmbed.setDescription(desc);

        (Msgchannel as BaseGuildTextChannel).send({ embeds: [logsEmbed] }).catch(() => { });
    },
};