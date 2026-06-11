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

import { ButtonInteraction, EmbedBuilder, GuildMember } from "discord.js";
import { tempTable } from "../../../Events/client/ready.ts";

export default async function (interaction: ButtonInteraction<"cached">) {
	const result = await interaction.client.db.get(
		`${interaction.guildId}.VOICE_INTERFACE.interface`
	);
	const targetedChannel = (interaction.member as GuildMember).voice.channel;

	const lang = await interaction.client.func.getLanguageData(
		interaction.guildId
	);
	const member = interaction.member as GuildMember;

	const getChannelOwner = await tempTable.get(
		`CUSTOM_VOICE.${interaction.guildId}.${interaction.user.id}`
	);

	if (!result) return interaction.deferUpdate();
	if (
		result.channelId !== interaction.channelId ||
		getChannelOwner !== targetedChannel?.id
	)
		return await interaction.deferUpdate();

	if (!member.voice.channel) {
		await interaction.deferUpdate();
		return;
	} else {
		await targetedChannel?.delete();
		await tempTable.delete(
			`CUSTOM_VOICE.${interaction.guildId}.${interaction.user.id}`
		);

		await interaction.reply({
			embeds: [
				new EmbedBuilder()
					.setDescription(
						lang.temporary_voice_delete_button_desc_embed
					)
					.setColor(2829617)
					.setImage(
						await client.func.bannerGenerator(interaction.guild.id)
					)
					.setFooter(
						await interaction.client.func.displayBotName.footerBuilder(
							interaction.guildId!
						)
					)
			],
			files: [
				await interaction.client.func.displayBotName.footerAttachmentBuilder(
					interaction
				)
			],
			flags: [1 << 6]
		});
	}
}
