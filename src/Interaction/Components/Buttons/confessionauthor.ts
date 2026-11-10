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
	ButtonInteraction,
	EmbedBuilder,
	MessageFlags,
	PermissionFlagsBits
} from "discord.js";

import { openConfessionAuthor } from "../../../core/modules/confessionManager.js";
export default async function (interaction: ButtonInteraction<"cached">) {
	if (
		!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)
	) {
		const lang = await interaction.client.func.getLanguageData(
			interaction.guildId
		);

		await interaction.reply({
			content: lang.var_dont_have_perm.replace(
				"{perm}",
				"ModerateMembers"
			),
			flags: MessageFlags.Ephemeral
		});
		return;
	}

	const payload = interaction.customId.split("%")[1] || "";
	// Buttons posted before the author id was sealed hold it in clear.
	const confessionAuthor = /^\d{17,20}$/.test(payload)
		? payload
		: openConfessionAuthor(interaction.client, payload);

	// The author may have left the guild: look the account up, not the member.
	const user = confessionAuthor
		? await interaction.client.users
				.fetch(confessionAuthor)
				.catch(() => null)
		: null;

	if (!user) {
		await interaction.reply({
			content: `❌`,
			flags: MessageFlags.Ephemeral
		});
		return;
	}

	const embed = new EmbedBuilder()
		.setColor("#010101")
		.setAuthor({
			name: user.username,
			iconURL: user.displayAvatarURL({
				forceStatic: false,
				size: 4096
			}),
			url: `https://discordapp.com/users/${user.id}`
		})
		.setDescription(`<@${user.id}>`)
		.setFooter(
			await interaction.client.func.displayBotName.footerBuilder(
				interaction.guildId!
			)
		);

	await interaction.reply({
		files: [
			await interaction.client.func.displayBotName.footerAttachmentBuilder(
				interaction
			)
		],
		flags: MessageFlags.Ephemeral,
		embeds: [embed]
	});
}
