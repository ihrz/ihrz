/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import {
	BaseGuildTextChannel,
	Channel,
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
	Message,
	PermissionsBitField,
	User,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	RoleSelectMenuBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	ComponentType,
	Colors,
	Role,
	GuildTextChannelType,
	ApplicationCommandType,
	ChannelSelectMenuBuilder,
	ChannelType,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';
import { DatabaseStructure } from '../../../../types/database_structure.js';
import { iHorizonModalResolve } from '../../../core/functions/modalHelper.js';
import { isDiscordEmoji, isSingleEmoji } from '../../../core/functions/emojiChecker.js';

export const command: Command = {
	name: "autoreact",

	description: "Sent specified emoji when new message in specified channel",
	description_localizations: {
		"fr": "Envoyer un emoji spécifié lorsqu'un nouveau message est envoyé dans un canal spécifié"
	},

	thinking: true,
	category: 'guildconfig',

	permission: PermissionsBitField.Flags.Administrator,

	type: ApplicationCommandType.ChatInput,
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		let autoreactConfig = await client.db.get(`${interaction.guild.id}.GUILD.AUTOREACT`) || {} as DatabaseStructure.DbGuildAutoReact;

		autoreactConfig = Object.fromEntries(
			Object.entries(autoreactConfig).map(([channelId, reaction]) => [
				channelId,
				Array.isArray(reaction) ? reaction : [reaction]
			])
		);

		const itemsPerPage = 5;
		let currentPage = 0;

		const createRankRolesEmbed = (page: number) => {
			const channelEntries = Object.entries(autoreactConfig || {})
				.sort(([levelA], [levelB]) => parseInt(levelB) - parseInt(levelA));

			const startIndex = page * itemsPerPage;
			const pageValue = channelEntries.slice(startIndex, startIndex + itemsPerPage);

			let currentPage = page + 1;
			let totalPage = Math.max(1, Math.ceil(channelEntries.length / itemsPerPage));
			let totalReact = channelEntries.length;

			const embed = new EmbedBuilder()
				.setColor(Colors.Blurple)
				.setTitle(lang.autoreact_embed_title)
				.setDescription(lang.autoreact_embed_desc)
				.addFields(
					pageValue.length > 0
						? pageValue.map(([channelId, reactions]) => ({
							name: `${interaction.guild?.channels.cache.get(channelId)?.toString() || lang.var_unknown}`,
							value: lang.autoreact_embed_autofields_value.replace(
								"${reaction}",
								Array.isArray(reactions) ? reactions.join(" ") : String(reactions)
							),
							inline: false
						}))
						: [{
							name: lang.var_no_set,
							value: lang.autoreact_embed_autofields_none_value,
							inline: false
						}]
				)
				.setFooter({
					text: lang.autoreact_embed_footer
						.replace("${currentPage}", String(currentPage))
						.replace("${totalPage}", String(totalPage))
						.replace("${totalReact}", String(totalReact)),
					iconURL: interaction.guild?.iconURL() || undefined
				})
				.setTimestamp();

			return embed;
		};

		const createActionRow = () => {
			const valueEntries = Object.entries(autoreactConfig || {});

			const navigationRow = new ActionRowBuilder<ButtonBuilder>()
				.addComponents(
					new ButtonBuilder()
						.setCustomId('prev_page')
						.setLabel('<<<')
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(currentPage === 0),
					new ButtonBuilder()
						.setCustomId('add_channel')
						.setLabel(lang.autoreact_btn_add_name)
						.setStyle(ButtonStyle.Success),
					new ButtonBuilder()
						.setCustomId('remove_channel')
						.setLabel(lang.autoreact_btn_remove_name)
						.setStyle(ButtonStyle.Danger),
					new ButtonBuilder()
						.setCustomId('next_page')
						.setLabel('>>>')
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(currentPage >= Math.floor(valueEntries.length / itemsPerPage)),
				);

			return navigationRow;
		};

		const createReturnRow = () => {
			return new ActionRowBuilder<ButtonBuilder>()
				.addComponents(
					new ButtonBuilder()
						.setCustomId('return_to_main')
						.setLabel(lang.backup_cancel_button)
						.setStyle(ButtonStyle.Secondary)
				);
		};

		const message = await client.func.method.interactionSend(interaction, {
			embeds: [createRankRolesEmbed(currentPage)],
			components: [createActionRow()]
		});

		const collector = message.createMessageComponentCollector({
			time: 180000,
			componentType: ComponentType.Button
		});

		collector.on('collect', async (interaction2) => {
			if (interaction2.user.id !== interaction.member?.user.id) {
				await interaction2.reply({
					content: lang.help_not_for_you,
					ephemeral: true
				});
				return;
			}

			if (interaction2.customId === 'prev_page') {
				currentPage = Math.max(0, currentPage - 1);
				await interaction2.update({
					embeds: [createRankRolesEmbed(currentPage)],
					components: [createActionRow()]
				});
				return;
			}

			if (interaction2.customId === 'next_page') {
				const valueEntries = Object.entries(autoreactConfig || {});
				currentPage = Math.min(Math.floor(valueEntries.length / itemsPerPage), currentPage + 1);
				await interaction2.update({
					embeds: [createRankRolesEmbed(currentPage)],
					components: [createActionRow()]
				});
				return;
			}

			if (interaction2.customId === 'return_to_main') {
				await interaction2.update({
					content: null,
					embeds: [createRankRolesEmbed(currentPage)],
					components: [createActionRow()]
				});
				return;
			}

			if (interaction2.customId === 'add_channel') {

				const currentValues = Object.values(autoreactConfig || {});
				if (currentValues.length >= 25) {
					await interaction2.reply({
						content: lang.autoreact_max_25,
						ephemeral: true
					});
					return;
				}

				const channelSelectRow = new ActionRowBuilder<ChannelSelectMenuBuilder>()
					.addComponents(
						new ChannelSelectMenuBuilder()
							.setCustomId('select_channel_to_add')
							.setPlaceholder(lang.autoreact_menu_add_place)
							.setChannelTypes(ChannelType.GuildText)
					);

				let awaiting = await interaction2.update({
					content: lang.autoreact_awaiting1_msg,
					components: [channelSelectRow, createReturnRow()]
				});

				let response1;
				try {
					response1 = await awaiting.awaitMessageComponent({
						time: 600_000,
						componentType: ComponentType.ChannelSelect
					});
				} catch {
					await message.edit({
						content: null,
						embeds: [createRankRolesEmbed(currentPage)],
						components: [createActionRow()]
					});
					return;
				}

				const selectedChannel = response1.values[0];
				if (!selectedChannel) return;

				const response2 = await iHorizonModalResolve({
					title: lang.autoreact_modal_title,
					customId: 'level_input_modal',
					deferUpdate: false,
					fields: [
						{
							customId: 'reaction_input',
							label: lang.autoreact_modal_fields1_label,
							style: TextInputStyle.Short,
							required: true,
							minLength: 1,
							maxLength: 200,
						}
					]
				}, response1);

				const reactInput = response2?.fields.getTextInputValue('reaction_input') || "";

				if (reactInput !== '') {
					if (!isSingleEmoji(reactInput) && !isDiscordEmoji(reactInput)) {
						await response2?.reply({
							content: lang.autoreact_invalid_emoji,
							ephemeral: true
						});

						await message.edit({
							content: null,
							embeds: [createRankRolesEmbed(currentPage)],
							components: [createActionRow()]
						});
						return;
					}
				}

				if (selectedChannel) {
					const existingReactions = autoreactConfig[selectedChannel] || [];
					const reactionsArray = Array.isArray(existingReactions) ? existingReactions : [existingReactions];

					if (!reactionsArray.includes(reactInput)) {
						reactionsArray.push(reactInput);
						autoreactConfig[selectedChannel] = reactionsArray;
						await client.db.set(`${interaction.guild?.id}.GUILD.AUTOREACT`, autoreactConfig);
					}

					await message.edit({
						content: null,
						embeds: [createRankRolesEmbed(currentPage)],
						components: [createActionRow()]
					});

					await response2?.reply({
						content: lang.autoreact_add_command_ok,
						ephemeral: true
					});
				}
				return;
			}

			// Remove Role Flow
			if (interaction2.customId === 'remove_channel') {
				const channelEntries = Object.entries(autoreactConfig || {});

				if (channelEntries.length === 0) {
					await interaction2.reply({
						content: lang.autoreact_remove_not_found,
						ephemeral: true
					});

					await message.edit({
						content: null,
						embeds: [createRankRolesEmbed(currentPage)],
						components: [createActionRow()]
					});
					return;
				}

				const channelOptions = Object.entries(autoreactConfig || {}).map(([channelId, _]) =>
					new StringSelectMenuOptionBuilder()
						.setLabel(lang.var_text_channel + ": " + interaction.guild?.channels.cache.get(channelId)?.name || lang.var_unknown)
						.setValue(channelId)
				);

				const removeRoleRow = new ActionRowBuilder<StringSelectMenuBuilder>()
					.addComponents(
						new StringSelectMenuBuilder()
							.setCustomId('select_channel_to_remove')
							.setPlaceholder(lang.autoreact_menu_remove_place)
							.addOptions(channelOptions)
					);

				let awaiting = await interaction2.update({
					content: lang.autoreact_awaiting_remove_msg,
					components: [removeRoleRow, createReturnRow()]
				});

				let response1;
				try {
					response1 = await awaiting.awaitMessageComponent({
						time: 600_000,
						componentType: ComponentType.StringSelect
					});
				} catch {
					await message.edit({
						content: null,
						embeds: [createRankRolesEmbed(currentPage)],
						components: [createActionRow()]
					});
					return;
				}

				const channelToRemove = response1.values[0];
				delete autoreactConfig[channelToRemove];

				await client.db.set(`${interaction.guild?.id}.GUILD.AUTOREACT`, autoreactConfig);

				await message.edit({
					content: null,
					embeds: [createRankRolesEmbed(currentPage)],
					components: [createActionRow()]
				});

				await response1.reply({
					content: lang.autoreact_remove_command_ok,
					ephemeral: true
				});
				return;
			}
		});

		collector.on('end', async () => {
			await message.edit({ components: [] });
		});
	},
};