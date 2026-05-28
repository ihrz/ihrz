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
	ChatInputCommandInteraction,
	Message,
	GuildMember
} from "discord.js";

import { LanguageData } from "../../../../../types/languageData.js";
import { SubCommand } from "../../../../../types/command.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		if (
			!client.user ||
			!interaction.member ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const target =
			interaction instanceof ChatInputCommandInteraction
				? interaction.options.getMember("member")
				: client.func.method.member(interaction, args!, 0);

		if (!target) {
			await client.func.method.interactionSend(interaction, {
				content: lang.util_wlvc_no_member
			});
			return;
		}

		const baseData = (await client.db.get(
			`${interaction.guildId}.UTILS.VOICE_FREEZE`
		)) as { channelId?: string; allowedUsers?: string[] } | null;

		if (!baseData?.channelId) {
			await client.func.method.interactionSend(interaction, {
				content: lang.util_wlvc_no_freeze
			});
			return;
		}

		const allowedUsers = Array.from(
			new Set([...(baseData.allowedUsers || []), target.id])
		);

		await client.db.set(`${interaction.guildId}.UTILS.VOICE_FREEZE`, {
			...baseData,
			allowedUsers
		});

		await client.func.ihorizon_logs(interaction, {
			title: lang.util_wlvc_logs_title,
			description: lang.util_wlvc_logs_description
				.replace(
					"${interaction.member.user.toString()}",
					(interaction.member as GuildMember).user.toString()
				)
				.replace("${member.toString()}", target.toString())
		});

		await client.func.method.interactionSend(interaction, {
			content: lang.util_wlvc_command_work.replace(
				"${member.toString()}",
				target.toString()
			)
		});
		return;
	}
};
