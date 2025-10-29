/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import { EmbedBuilder, PermissionsBitField, AuditLogEvent, Client, GuildMember, BaseGuildTextChannel } from 'discord.js';

import { BotEvent } from '../../../types/event.js';
import { getLogs, handledAuditLogEntrie_logs, handledAuditLogEntries } from '../protection/ready.js';

export const event: BotEvent = {
	name: "guildMemberUpdate",
	run: async (client: Client, oldMember: GuildMember, newMember: GuildMember) => {

		const data = await client.func.getLanguageData(newMember.guild.id);

		if (!newMember.guild.members.me?.permissions.has([
			PermissionsBitField.Flags.ViewAuditLog,
			PermissionsBitField.Flags.ManageGuild
		])) return;

		const someinfo = await client.db.get(`${newMember.guild.id}.GUILD.SERVER_LOGS.roles`);
		const Msgchannel = newMember.guild.channels.cache.get(someinfo);

		if (!someinfo || !Msgchannel) return;

		const firstEntry = await getLogs(newMember.guild, newMember.user.id, AuditLogEvent.MemberRoleUpdate, 2);

		if (!firstEntry
			|| firstEntry.executorId == client.user?.id
			|| firstEntry.targetId !== newMember.user.id
		) return;

		interface CustomObject {
			id: string;
		}

		const newObjects: CustomObject[] = [];
		const removeObjects: CustomObject[] = [];

		firstEntry.changes.forEach((item) => {
			if (item.key === '$add') {
				newObjects.push(...<CustomObject[]>item.new);
			} else if (item.key === '$remove') {
				removeObjects.push(...<CustomObject[]>item.new);
			}
		});

		const newObjectsnewObjectIds: string[] = newObjects.map((obj) => obj.id);
		const removeObjectIds: string[] = removeObjects.map((obj) => obj.id);
		let user = newMember.guild.members.cache.get(firstEntry.targetId);

		const logsEmbed = new EmbedBuilder()
			.setColor("#010101")
			.setAuthor({ name: user?.user.username!, iconURL: user?.user?.displayAvatarURL({ extension: 'png', forceStatic: false, size: 512 }) })
			.setTimestamp();

		let desc = ' ';

		if (removeObjects.length >= 1) {
			desc += data.event_srvLogs_guildMemberUpdate_description
				.replace("${firstEntry.executor.id}", firstEntry.executor?.id!)
				.replace("${removedRoles}", removeObjectIds.map(value => `<@&${value}>`).toString())
				.replace("${oldMember.user.username}", user?.user?.username!) + '\n';
		};

		if (newObjects.length >= 1) {
			desc += data.event_srvLogs_guildMemberUpdate_2_description
				.replace("${firstEntry.executor.id}", firstEntry.executor?.id!)
				.replace("${addedRoles}", newObjectsnewObjectIds.map(value => `<@&${value}>`).toString())
				.replace("${oldMember.user.username}", user?.user?.username!);
		};
		logsEmbed.setDescription(desc);

		(Msgchannel as BaseGuildTextChannel).send({ embeds: [logsEmbed] }).catch(() => { });
	},
};