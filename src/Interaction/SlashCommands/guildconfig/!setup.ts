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
	ChannelType,
	PermissionFlagsBits,
	ChatInputCommandInteraction,
	Guild,
	OverwriteResolvable,
	OverwriteType
} from "discord.js";
import { LanguageData } from "../../../../types/languageData.js";

import { SubCommand } from "../../../../types/command.js";
import { cardPayload, notice } from "../../../core/modules/uiCard.js";

/**
 * The ihorizon-logs channel is hidden from @everyone; without its own overwrite a bot that is not an administrator
 * would lock itself out of the channel it just created (no log could ever be posted there).
 */
export function ihorizonLogsOverwrites(
	guild: Guild,
	botId: string
): OverwriteResolvable[] {
	return [
		{
			id: guild.roles.everyone.id,
			deny: [
				PermissionFlagsBits.ViewChannel,
				PermissionFlagsBits.SendMessages,
				PermissionFlagsBits.ReadMessageHistory
			]
		},
		{
			id: botId,
			type: OverwriteType.Member,
			allow: [
				PermissionFlagsBits.ViewChannel,
				PermissionFlagsBits.SendMessages,
				PermissionFlagsBits.EmbedLinks
			]
		}
	];
}

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached">,
		lang: LanguageData,
		args?: string[]
	) => {
		// Guard's Typing
		if (
			!interaction.member ||
			!client.user ||
			!interaction.user ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const logchannel = interaction.guild.channels.cache.find((channel) =>
			channel.name.includes("ihorizon-logs")
		);
		if (!logchannel) {
			// Awaited: a refused creation (missing Manage Channels) used to be reported as a success.
			const created = await interaction.guild.channels
				.create({
					name: "ihorizon-logs",
					type: ChannelType.GuildText,
					permissionOverwrites: ihorizonLogsOverwrites(
						interaction.guild,
						client.user.id
					)
				})
				.catch(() => null);
			if (!created) {
				await interaction.editReply({
					content: lang.setup_command_error
				});
				return;
			}

			await interaction.editReply(
				cardPayload(
					notice(
						"success",
						lang.setup_command_work.replace(
							"${emoji_Yes}",
							client.iHorizon_Emojis.Yes
						)
					)
				) as never
			);
			return;
		} else {
			await interaction.editReply({ content: lang.setup_command_error });
			return;
		}
	}
};
