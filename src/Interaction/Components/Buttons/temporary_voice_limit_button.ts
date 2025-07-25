/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import { ButtonInteraction, EmbedBuilder, GuildMember, TextInputStyle } from 'discord.js';
import { iHorizonModalResolve } from '../../../core/functions/modalHelper.js';

export default async function (interaction: ButtonInteraction<"cached">) {

	const result = await interaction.client.db.get(`${interaction.guildId}.VOICE_INTERFACE.interface`);
	const table = await interaction.client.db.table('TEMP');

	const lang = await interaction.client.func.getLanguageData(interaction.guildId);
	const member = interaction.member as GuildMember;

	const targetedChannel = (interaction.member as GuildMember).voice.channel;

	const getChannelOwner = await table.get(`CUSTOM_VOICE.${interaction.guildId}.${interaction.user.id}`);

	if (!result) return await interaction.deferUpdate();
	if (result.channelId !== interaction.channelId
		|| getChannelOwner !== targetedChannel?.id) return await interaction.deferUpdate();

	if (!member.voice.channel) {
		await interaction.deferUpdate()
		return;
	} else {
		const response = await iHorizonModalResolve({
			customId: 'modal',
			deferUpdate: false,
			title: lang.temporary_voice_modal_title,
			fields: [
				{
					customId: 'name',
					label: lang.temporary_voice_limit_button_menu_label,
					style: TextInputStyle.Short,
					required: true,
					maxLength: 20,
					minLength: 1
				},
			]
		}, interaction);

		if (!response) return;

		const channel = (interaction.member as GuildMember).voice.channel;
		const userLimit = parseInt(response.fields.getField('name').value);

		if (!userLimit) {
			await response.reply({
				content: lang.temporary_voice_limit_button_not_integer
					.replace("${interaction.client.iHorizon_Emojis.No}", interaction.client.iHorizon_Emojis.No)
				,
				flags: [1 << 6]
			});

			return;
		};

		channel?.setUserLimit(userLimit);

		await response.reply({
			embeds: [
				new EmbedBuilder()
					.setDescription(lang.temporary_voice_title_embec)
					.setColor(2829617)
					.setFields(
						{
							name: lang.temporary_voice_new_userlimit,
							value: `${interaction.client.iHorizon_Emojis.VC_Limit} **${response.fields.getField('name').value}**`,
							inline: true
						},
					)
					.setImage(`https://ihorizon.org/assets/img/banner/ihrz_${await interaction.client.db.get(`${interaction.guildId}.GUILD.LANG.lang`) || 'en-US'}.png`)
					.setFooter(await interaction.client.func.displayBotName.footerBuilder(interaction.guildId!))
			],
			files: [await interaction.client.func.displayBotName.footerAttachmentBuilder(interaction)],
			flags: [1 << 6]
		});
	}
};