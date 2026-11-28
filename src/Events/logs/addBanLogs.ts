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
	Client,
	PermissionsBitField,
	AuditLogEvent,
	GuildBan
} from "discord.js";

import { BotEvent } from "../../../types/event.js";
import { sendLogCard } from "../../core/modules/logCard.js";
import { getLogs } from "../protection/auditLogs.js";

export const event: BotEvent = {
	name: "guildBanAdd",
	run: async (client: Client, ban: GuildBan) => {
		const data = await client.func.getLanguageData(ban.guild.id);

		if (
			!ban.guild.members.me ||
			!ban.guild.members.me.permissions.has([
				PermissionsBitField.Flags.ViewAuditLog,
				PermissionsBitField.Flags.ManageGuild
			])
		)
			return;

		const Msgchannel = await client.func.logChannel.getLogChannel(
			ban.guild,
			"moderation"
		);
		if (!Msgchannel) return;

		const relevantLog = await getLogs({
			guild: ban.guild,
			target: ban.user.id,
			actionType: AuditLogEvent.MemberBanAdd,
			type: "LOGS"
		});
		if (!relevantLog) return;

		await sendLogCard(Msgchannel, {
			kind: "danger",
			emoji: client.iHorizon_Emojis.Ban_Hammer,
			title: data.logs_ban_add_title,
			thumbnail: ban.user.displayAvatarURL(),
			description: data.event_srvLogs_banAdd_description
				.replace("${executorId}", relevantLog?.executor?.id as string)
				.replace("${targetId}", relevantLog?.targetId as string),
			blocks: [
				`**${data.event_srvLogs_banAdd_fields_name}**\n${data.event_srvLogs_banAdd_fields_value.replace(
					"{reason}",
					relevantLog?.reason || data.blacklist_var_no_reason
				)}`
			]
		});
	}
};
