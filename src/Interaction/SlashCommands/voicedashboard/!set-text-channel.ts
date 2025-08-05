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

import {
	ActionRowBuilder,
	BaseGuildTextChannel,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, lang: LanguageData, args?: string[]) => {


		// Guard's Typing
		if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

		const targetedChannel = interaction.options.getChannel('channel');

		const embed = new EmbedBuilder()
			.setColor(2829617)
			.setImage(`https://ihorizon.org/assets/img/banner/ihrz_${await client.db.get(`${interaction.guildId}.GUILD.LANG.lang`) || 'en-US'}.png`)
			.setDescription(
				lang.tempvoice_if_text_desc_embed
			)
			.addFields(
				{
					name: "** **",
					value: lang.tempvoice_if_text_fields_value_limit
						.replace('${client.iHorizon_Emojis.VC_Limit}', client.iHorizon_Emojis.VC_Limit)
					,
					inline: true
				},
				{
					name: "** **",
					value: lang.tempvoice_if_text_fields_value_name
						.replace('${client.iHorizon_Emojis.VC_Name}', client.iHorizon_Emojis.VC_Name)
					,
					inline: true
				},
				{
					name: "** **",
					value: lang.tempvoice_if_text_fields_value_region
						.replace('${client.iHorizon_Emojis.VC_Region}', client.iHorizon_Emojis.VC_Region)
					,
					inline: true
				},
				{
					name: "** **",
					value: lang.tempvoice_if_text_fields_value_trust
						.replace("${client.iHorizon_Emojis.VC_Trust}", client.iHorizon_Emojis.VC_Trust)
					,
					inline: true
				},
				{
					name: "** **",
					value: `** **`,
					inline: true
				},
				{
					name: "** **",
					value: lang.tempvoice_if_text_fields_value_untrust
						.replace("${client.iHorizon_Emojis.VC_Untrust}", client.iHorizon_Emojis.VC_Untrust)
					,
					inline: true
				},
				{
					name: "** **",
					value: lang.tempvoice_if_text_fields_value_block
						.replace("${client.iHorizon_Emojis.VC_Block}", client.iHorizon_Emojis.VC_Block)
					,
					inline: true
				},
				{
					name: "** **",
					value: `** **`,
					inline: true
				},
				{
					name: "** **",
					value: lang.tempvoice_if_text_fields_value_unblock
						.replace("${client.iHorizon_Emojis.VC_Unblock}", client.iHorizon_Emojis.VC_Unblock)
					,
					inline: true
				},
				{
					name: "** **",
					value: lang.tempvoice_if_text_fields_value_claim
						.replace("${client.iHorizon_Emojis.VC_Claim}", client.iHorizon_Emojis.VC_Claim)
					,
					inline: true
				},
				{
					name: "** **",
					value: lang.tempvoice_if_text_fields_value_privacy
						.replace("${client.iHorizon_Emojis.VC_Privacy}", client.iHorizon_Emojis.VC_Privacy)
					,
					inline: true
				},
				{
					name: "** **",
					value: lang.tempvoice_if_text_fields_value_transfer
						.replace('${client.iHorizon_Emojis.VC_Transfer}', client.iHorizon_Emojis.VC_Transfer)
					,
					inline: true
				},
				{
					name: "** **",
					value: `** **`,
					inline: true
				},
				{
					name: "** **",
					value: lang.tempvoice_if_text_fields_value_delete
						.replace('${client.iHorizon_Emojis.VC_Delete}', client.iHorizon_Emojis.VC_Delete)
					,
					inline: true
				},
				{
					name: "** **",
					value: `** **`,
					inline: true
				},
			)
			.setFooter(await client.func.displayBotName.footerBuilder(interaction.guildId!));

		const buttonRows = [
			[
				{ emoji: client.iHorizon_Emojis.VC_Limit, customId: 'temporary_voice_limit_button' },
				{ emoji: client.iHorizon_Emojis.VC_Name, customId: 'temporary_voice_name_button' },
				{ emoji: client.iHorizon_Emojis.VC_Claim, customId: 'temporary_voice_claim_button' },
				{ emoji: client.iHorizon_Emojis.VC_Privacy, customId: 'temporary_voice_privacy_button' },
				{ emoji: client.iHorizon_Emojis.VC_Region, customId: 'temporary_voice_region_button' },
			],
			[
				{ emoji: client.iHorizon_Emojis.VC_Trust, customId: 'temporary_voice_trust_button' },
				{ emoji: client.iHorizon_Emojis.VC_Block, customId: 'temporary_voice_block_button' },
				{ emoji: client.iHorizon_Emojis.VC_Transfer, customId: 'temporary_voice_transfer_button' },
				{ emoji: client.iHorizon_Emojis.VC_Unblock, customId: 'temporary_voice_unblock_button' },
				{ emoji: client.iHorizon_Emojis.VC_Untrust, customId: 'temporary_voice_untrust_button' },
			],
			[
				{ emoji: client.iHorizon_Emojis.Empty, customId: 'temporary_voice_disable1_button', disabled: true },
				{ emoji: client.iHorizon_Emojis.Empty, customId: 'temporary_voice_disable2_button', disabled: true },
				{ emoji: client.iHorizon_Emojis.VC_Delete, customId: 'temporary_voice_delete_button' },
				{ emoji: client.iHorizon_Emojis.Empty, customId: 'temporary_voice_disable3_button', disabled: true },
				{ emoji: client.iHorizon_Emojis.Empty, customId: 'temporary_voice_disable4_button', disabled: true },
			]
		];

		const components = buttonRows.map(row =>
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				...row.map(button =>
					new ButtonBuilder()
						.setEmoji(button.emoji)
						.setCustomId(button.customId)
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(button.disabled || false)
				)
			)
		);

		const response = await (targetedChannel as BaseGuildTextChannel).send({ embeds: [embed], components });

		await interaction.editReply({ content: `${client.iHorizon_Emojis.Yes} | ${response.url}` });

		await client.db.set(`${interaction.guildId}.VOICE_INTERFACE.interface`,
			{
				channelId: response.channelId,
				messageId: response.id
			}
		);
	},
};