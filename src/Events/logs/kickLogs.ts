/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2026 iHorizon
*/

import {
	PermissionsBitField,
	AuditLogEvent,
	Client,
	GuildMember
} from "discord.js";

import { BotEvent } from "../../../types/event.js";
import { sendLogCard } from "../../core/modules/logCard.js";
import { getLogs } from "../protection/auditLogs.js";

export const event: BotEvent = {
	name: "guildMemberRemove",
	run: async (client: Client, member: GuildMember) => {
		const data = await client.func.getLanguageData(member.guild.id);

		if (!member.guild) return;
		if (!member.guild.members.me) return;

		if (
			!member.guild.members.me.permissions.has([
				PermissionsBitField.Flags.ViewAuditLog,
				PermissionsBitField.Flags.ManageGuild
			])
		)
			return;

		const someinfo = await client.db.get(
			`${member.guild.id}.GUILD.SERVER_LOGS.moderation`
		);
		if (!someinfo) return;

		const Msgchannel = member.guild.channels.cache.get(someinfo);
		if (!Msgchannel) return;

		const firstEntry = await getLogs({
			guild: member.guild,
			target: member.id,
			actionType: AuditLogEvent.MemberKick,
			type: "LOGS"
		});
		if (!firstEntry) return;

		await sendLogCard(Msgchannel, {
			kind: "danger",
			emoji: client.iHorizon_Emojis.Warning_Icon,
			title: data.logs_kick_title,
			thumbnail: member.user.displayAvatarURL(),
			description: data.event_srvLogs_guildMemberRemove_description
				.replace("${executorId}", firstEntry.executor?.id as string)
				.replace("${targetId}", firstEntry.targetId!),
			blocks: [
				`**${data.event_srvLogs_banAdd_fields_name}**\n${data.event_srvLogs_banAdd_fields_value.replace(
					"{reason}",
					firstEntry?.reason || data.blacklist_var_no_reason
				)}`
			]
		});
	}
};
