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

import { ButtonInteraction, ChannelType, MessageFlags } from "discord.js";

import { isModuleDisabled } from "../../../core/functions/moduleToggle.js";
import { threadTicketSummary } from "../../../core/modules/ticketThreads.js";

// The hub of a threads' channel: the tickets the member can see, privately.
export default async function (interaction: ButtonInteraction<"cached">) {
	const channel = interaction.channel;
	if (channel?.type !== ChannelType.GuildText) return;
	const lang = await interaction.client.func.getLanguageData(
		interaction.guildId
	);
	if (
		await isModuleDisabled(
			interaction.client,
			interaction.guildId,
			"ticket"
		)
	) {
		await interaction.reply({
			content: lang.ticket_disabled_command,
			flags: MessageFlags.Ephemeral
		});
		return;
	}
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });
	await interaction.editReply(
		await threadTicketSummary(interaction.member, channel, lang)
	);
}
