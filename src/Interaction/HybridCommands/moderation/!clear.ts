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
	Collection,
	Message,
	MessageResolvable,
	Snowflake
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";

import { SubCommand } from "../../../../types/command.js";
import {
	bulkClear,
	selectMessagesToClear
} from "../../../core/modules/moderationOps.js";

export async function afterSent(
	sent: Message,
	interaction: ChatInputCommandInteraction<"cached"> | Message
): Promise<void> {
	if (sent.deletable) await sent.delete().catch(() => null);
	if (interaction instanceof Message && interaction.deletable) {
		await interaction.delete().catch(() => null);
	}
}

export async function clearMessage(
	body:
		Collection<Snowflake, Message> | readonly MessageResolvable[] | number,
	interaction: ChatInputCommandInteraction<"cached"> | Message,
	lang: LanguageData
): Promise<void> {
	try {
		const count = await bulkClear(
			interaction.channel as BaseGuildTextChannel,
			body,
			interaction.member?.user.id,
			lang
		);

		const sent = await client.func.method.channelSend(interaction, {
			content: lang.clear_confirmation_message.replace(
				"${messageCount}",
				count.toString()
			)
		});

		setTimeout(() => afterSent(sent, interaction), 5000);
	} catch (error) {
		logger.err("[clear] bulkDelete failed:", error);
		await client.func.method.interactionSend(interaction, {
			content: `${error?.message}`
		});
	}
}

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

		const opts = client.func.method.options(interaction, args);
		const amount = opts.number("number", 0, true) + 1;
		const member = opts.member("member", 1);

		const channel = interaction.channel as BaseGuildTextChannel;

		const selected = await selectMessagesToClear(
			channel,
			amount,
			member?.id ?? null
		);

		if (selected === null) {
			await client.func.method.interactionSend(interaction, {
				content: lang.clear_command_no_message
			});
			return;
		}

		await clearMessage(selected, interaction, lang);
	}
};
