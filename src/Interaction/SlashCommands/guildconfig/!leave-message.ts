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
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	Client,
	ComponentType,
	EmbedBuilder,
	Message,
	TextInputStyle
} from 'discord.js';
import { iHorizonModalResolve } from '../../../core/functions/modalHelper.js';
import { LanguageData } from '../../../../types/languageData.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {


		// Guard's Typing
		if (!interaction.member || !client.user || !interaction.member.user.id || !interaction.guild || !interaction.channel) return;

		let leaveMessage = await client.db.get(`${interaction.guildId}.GUILD.GUILD_CONFIG.leavemessage`);
		const guildLocal = await client.db.get(`${interaction.guild.id}.GUILD.LANG.lang`) || "en-US";
		leaveMessage = leaveMessage?.substring(0, 1010);

		const helpEmbed = new EmbedBuilder()
			.setColor("#ffb3cc")
			.setDescription(lang.setjoinmessage_help_embed_desc)
			.setTitle(lang.setleavemessage_help_embed_title)
			.addFields(
				{
					name: lang.setjoinmessage_help_embed_fields_custom_name,
					value: leaveMessage ? `\`\`\`${leaveMessage}\`\`\`` : lang.setjoinmessage_help_embed_fields_custom_name_empy
				},
				{
					name: lang.setjoinmessage_help_embed_fields_default_name_empy,
					value: `\`\`\`${lang.event_goodbye_inviter}\`\`\``
				}
			);

		const buttons = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(
				new ButtonBuilder()
					.setCustomId("leaveMessage-set-message")
					.setLabel(lang.setjoinmessage_button_set_name)
					.setStyle(ButtonStyle.Primary),
				new ButtonBuilder()
					.setCustomId("leaveMessage-default-message")
					.setLabel(lang.setjoinmessage_buttom_del_name)
					.setStyle(ButtonStyle.Danger),
			);

		const originalResponse = await client.func.method.interactionSend(interaction, {
			embeds: [helpEmbed],
			components: [buttons]
		});

		const collector = originalResponse.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 80_000
		});

		collector.on('collect', async (buttonInteraction) => {

			if (buttonInteraction.user.id !== interaction.member?.user.id) {
				await buttonInteraction.reply({ content: lang.help_not_for_you, flags: [1 << 6] });
				return;
			};

			if (buttonInteraction.customId === "leaveMessage-set-message") {
				const modalInteraction = (await iHorizonModalResolve({
					customId: 'leaveMessage-modal',
					title: lang.setleavemessage_awaiting_response,
					deferUpdate: false,
					fields: [
						{
							customId: 'leaveMessage-input',
							label: lang.guildprofil_embed_fields_leavemessage,
							style: TextInputStyle.Paragraph,
							required: true,
							maxLength: 1010,
						},
					]
				}, buttonInteraction))!;

				if (!modalInteraction) {
					return;
				}

				const response = modalInteraction.fields.getTextInputValue('leaveMessage-input');
				const newEmbed = EmbedBuilder.from(helpEmbed).setFields(
					{
						name: lang.setjoinmessage_help_embed_fields_custom_name,
						value: response ? `\`\`\`${response}\`\`\`` : lang.setjoinmessage_help_embed_fields_custom_name_empy
					},
				);

				await client.db.set(`${interaction.guildId}.GUILD.GUILD_CONFIG.leavemessage`, response);
				await modalInteraction.reply({
					content: lang.setleavemessage_command_work_on_enable
						.replace("${client.iHorizon_Emojis.Yes}", client.iHorizon_Emojis.Yes),
					flags: [1 << 6]
				});
				newEmbed.addFields(helpEmbed.data.fields![1]);
				await originalResponse.edit({ embeds: [newEmbed] });
				await client.func.ihorizon_logs(interaction, {
					title: lang.setleavemessage_logs_embed_title_on_enable,
					description: lang.setleavemessage_logs_embed_description_on_enable
						.replace("${interaction.user.id}", interaction.member.user.id)
				});
			} else if (buttonInteraction.customId === "leaveMessage-default-message") {
				const newEmbed = EmbedBuilder.from(helpEmbed).setFields(
					{
						name: lang.setjoinmessage_help_embed_fields_custom_name,
						value: lang.setjoinmessage_help_embed_fields_custom_name_empy
					},
				);

				await client.db.delete(`${interaction.guildId}.GUILD.GUILD_CONFIG.leavemessage`);

				await buttonInteraction.reply({
					content: lang.setleavemessage_command_work_on_enable
						.replace("${client.iHorizon_Emojis.Yes}", client.iHorizon_Emojis.Yes),
					flags: [1 << 6]
				});

				newEmbed.addFields(helpEmbed.data.fields![1]);
				await originalResponse.edit({ embeds: [newEmbed] });

				await client.func.ihorizon_logs(interaction, {
					title: lang.setleavemessage_logs_embed_title_on_disable,
					description: lang.setleavemessage_logs_embed_description_on_disable
						.replace("${interaction.user.id}", interaction.member.user.id)
				});
			}
		});

		collector.on('end', async () => {
			buttons.components.forEach(x => {
				x.setDisabled(true)
			})
			await originalResponse.edit({ components: [buttons] });
		});
	},
};