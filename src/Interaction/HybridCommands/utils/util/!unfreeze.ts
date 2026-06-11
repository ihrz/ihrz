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
		lang: LanguageData
	) => {
		if (
			!client.user ||
			!interaction.member ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const baseData = (await client.db.get(
			`${interaction.guildId}.UTILS.VOICE_FREEZE`
		)) as { channelId?: string } | null;

		if (!baseData?.channelId) {
			await client.func.method.interactionSend(interaction, {
				content: lang.util_unfreeze_no_freeze
			});
			return;
		}

		await client.db.delete(`${interaction.guildId}.UTILS.VOICE_FREEZE`);

		await client.func.ihorizon_logs(interaction, {
			title: lang.util_unfreeze_logs_title,
			description: lang.util_unfreeze_logs_description.replace(
				"${interaction.member.user.toString()}",
				(interaction.member as GuildMember).user.toString()
			)
		});

		await client.func.method.interactionSend(interaction, {
			content: lang.util_unfreeze_command_work
		});
		return;
	}
};
