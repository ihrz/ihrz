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
	BaseGuildTextChannel,
	ChatInputCommandInteraction,
	Client,
	Message
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
		// Guard's Typing
		if (
			!client.user ||
			!interaction.member ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		if (interaction instanceof ChatInputCommandInteraction) {
			var role = interaction.options.getRole("role");
		} else {
			var role = client.func.method.role(interaction, args!, 0);
		}

		let role_to_edit = role?.id || interaction.guild.id;

		try {
			const allChannels = await interaction.guild.channels.fetch();
			let unhiddenCount = 0;
			let errorCount = 0;

			await client.func.method.interactionSend(interaction, {
				content: lang.channel_unhideall_in_progress
			});

			for (const [_channelId, channel] of allChannels) {
				if (!channel || channel.type !== 0) continue;

				const textChannel = channel as BaseGuildTextChannel;

				try {
					if (!textChannel.manageable) {
						errorCount++;
						continue;
					}

					const everyoneOverwrite =
						textChannel.permissionOverwrites.cache.get(
							role_to_edit
						);

					if (
						everyoneOverwrite &&
						everyoneOverwrite.deny.has("ViewChannel")
					) {
						await textChannel.permissionOverwrites.edit(
							role_to_edit,
							{
								ViewChannel: null
							}
						);
						unhiddenCount++;
					}
				} catch (error) {
					errorCount++;
				}
			}

			await client.func.method.interactionSend(interaction, {
				content: lang.channel_unhideall_success
					.replace("{unhiddenCount}", unhiddenCount.toString())
					.replace("{errorCount}", errorCount.toString())
			});
		} catch (error) {
			await client.func.method.interactionSend(interaction, {
				content: lang.channel_unhideall_error
			});
		}
	}
};
