/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import { ButtonInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
export default async function (interaction: ButtonInteraction<"cached">) {

	const confessionAuthor = interaction.customId.split("%")[1];

	if (confessionAuthor) {
		let member = interaction.guild.members.cache.get(confessionAuthor) || await interaction.guild.members.fetch(confessionAuthor).catch(() => null);

		if (member) {
			const embed = new EmbedBuilder()
				.setColor("#010101")
				.setAuthor({
					name: member.user.username,
					iconURL: member.user.displayAvatarURL({ forceStatic: false, size: 4096 }),
					url: `https://discordapp.com/users/${member.user.id}`
				})
				.setDescription(`<@${member.user.id}>`)
				.setFooter(await interaction.client.func.displayBotName.footerBuilder(interaction.guildId!));
			interaction.reply({
				files: [await interaction.client.func.displayBotName.footerAttachmentBuilder(interaction)],
				flags: MessageFlags.Ephemeral,
				embeds: [embed]
			})
		}
	} else {
		interaction.reply({
			content: `❌`,
			flags: MessageFlags.Ephemeral
		});
	}

};