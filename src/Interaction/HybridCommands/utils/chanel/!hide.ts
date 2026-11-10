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
import { setChannelHidden } from "../../../../core/modules/moderationOps.js";

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

		let channel = interaction.channel as BaseGuildTextChannel;

		const opts = client.func.method.options(interaction, args);
		const role = opts.role("role", 0);

		let role_to_edit = role?.id || interaction.guild.id;

		if (!interaction.guild.channels.cache.get(channel.id)) {
			const fetched = await interaction.guild.channels
				.fetch(channel.id)
				.catch(() => null);
			if (fetched) channel = fetched as BaseGuildTextChannel;
		}

		const result = await setChannelHidden(channel, role_to_edit, true);

		if (result === "unchanged") {
			await client.func.method.interactionSend(interaction, {
				content: lang.channel_hide_already_hidden.replace(
					"@everyone",
					`<@&${role_to_edit}>`
				)
			});
			return;
		}

		if (result !== "ok") {
			await client.func.method.interactionSend(interaction, {
				content: lang.renew_dont_have_permission
			});
			return;
		}

		await client.func.method.interactionSend(interaction, {
			content: lang.channel_hide_success.replace(
				"@everyone",
				`<@&${role_to_edit}>`
			)
		});
	}
};
