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
	ChatInputCommandInteraction,
	Client,
	Message,
	PermissionFlagsBits,
	PermissionsBitField
} from "discord.js";

import { LanguageData } from "../../../../../types/languageData.js";

import { SubCommand } from "../../../../../types/command.js";
import { syncDerogation } from "../../../../core/modules/voiceModes.js";
import { role } from "../../../../core/functions/method.js";
import { DatabaseStructure } from "../../../../../types/database_structure.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		if (
			!interaction.member ||
			!client.user ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		if (
			!interaction.guild.members.me?.permissions.has(
				PermissionFlagsBits.ManageRoles
			) ||
			!interaction.guild.members.me?.permissions.has(
				PermissionFlagsBits.ManageChannels
			)
		) {
			await client.func.method.interactionSend(interaction, {
				content: lang.setjoinroles_var_perm_issue,
				flags: [1 << 6]
			});
			return;
		}

		const baseInteraction = await client.func.method.interactionSend(
			interaction,
			{
				content: client.iHorizon_Emojis.Discord_Loading
			}
		);

		const result = await syncDerogation(
			interaction.guild,
			interaction.member.user.tag
		);
		if (!result.ok) return;

		const content = result.created
			? lang.utils_derogation_created
			: result.missingChannels > 0
				? lang.utils_derogation_resynced
				: lang.utils_derogation_already_exists;

		await baseInteraction.edit({
			content: content
				.replace("${role}", result.role.toString())
				.replace(
					"${updatedChannels}",
					result.updatedChannels.toString()
				)
				.replace("${failedChannels}", result.failedChannels.toString())
				.replace(
					"${missingChannels}",
					result.missingChannels.toString()
				)
				.replace("${emoji_Yes}", client.iHorizon_Emojis.Yes)
				.replace("${emoji_No}", client.iHorizon_Emojis.No)
		});
	}
};
