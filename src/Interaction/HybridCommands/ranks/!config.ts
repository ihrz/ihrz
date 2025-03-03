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
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';

import { DatabaseStructure } from '../../../../types/database_structure.js';
import { iHorizonModalResolve } from '../../../core/functions/modalHelper.js';

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {
		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		let ranksConfig = await client.db.get(`${interaction.guild.id}.GUILD.XP_LEVELING`) || {
			message: '',
			disabled: false,
			ranksRoles: {},
			xpchannels: undefined,
			bypassChannels: undefined,
		} as DatabaseStructure.DbGuildXpLeveling;

		if (!ranksConfig.ranksRoles) {
			ranksConfig.ranksRoles = {};
		}

		const itemsPerPage = 5;
		let currentPage = 0;

		const createRankRolesEmbed = (page: number) => {
			const roleEntries = Object.entries(ranksConfig.ranksRoles || {})
				.sort(([levelA], [levelB]) => parseInt(levelB) - parseInt(levelA));

			const startIndex = page * itemsPerPage;
			const pageRoles = roleEntries.slice(startIndex, startIndex + itemsPerPage);

			let currentPage = page + 1;
			let totalPage = Math.max(1, Math.ceil(roleEntries.length / itemsPerPage));
			let totalRanks = roleEntries.length;

			const embed = new EmbedBuilder()
				.setColor(Colors.Blurple)
				.setTitle(lang.ranks_config_embed_title)
				.setDescription(lang.ranks_config_embed_desc)
				.addFields(
					pageRoles.length > 0
						? pageRoles.map(([level, roleId]) => ({
							name: lang.ranks_config_autofields_name
								.replace("${level}", level),
							value: lang.ranks_config_autofields_value
								.replace("${level}", level)
								.replace("${roleId}", String(roleId)),
							inline: false
						}))
						: [{
							name: lang.ranks_config_nofields_name,
							value: lang.ranks_config_nofields_value,
							inline: false
						}]
				)
				.setFooter({
					text: lang.ranks_config_help_footer
						.replace("${currentPage}", currentPage.toString())
						.replace("${totalPage}", totalPage.toString())
						.replace("${totalRanks}", totalRanks.toString()),
					iconURL: interaction.guild?.iconURL() || undefined
				})
				.setTimestamp();

			return embed;
		};

		const createActionRow = () => {
			const roleEntries = Object.entries(ranksConfig.ranksRoles || {});

			const navigationRow = new ActionRowBuilder<ButtonBuilder>()
				.addComponents(
					new ButtonBuilder()
						.setCustomId('prev_page')
						.setLabel('<<<')
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(currentPage === 0),
					new ButtonBuilder()
						.setCustomId('add_role')
						.setLabel(lang.ranks_config_btn_add_name)
						.setStyle(ButtonStyle.Success),
					new ButtonBuilder()
						.setCustomId('remove_role')
						.setLabel(lang.ranks_config_btn_remove_name)
						.setStyle(ButtonStyle.Danger),
					new ButtonBuilder()
						.setCustomId('next_page')
						.setLabel('>>>')
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(currentPage >= Math.floor(roleEntries.length / itemsPerPage)),
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
				const roleEntries = Object.entries(ranksConfig.ranksRoles || {});
				currentPage = Math.min(Math.floor(roleEntries.length / itemsPerPage), currentPage + 1);
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

			if (interaction2.customId === 'add_role') {

				const currentRoles = Object.values(ranksConfig.ranksRoles || {});
				if (currentRoles.length >= 25) {
					await interaction2.reply({
						content: lang.ranks_config_add_max_roles,
						ephemeral: true
					});
					return;
				}

				const roleSelectRow = new ActionRowBuilder<RoleSelectMenuBuilder>()
					.addComponents(
						new RoleSelectMenuBuilder()
							.setCustomId('select_role_to_add')
							.setPlaceholder(lang.ranks_config_add_role_menu_placeholder)
					);

				let awaiting = await interaction2.update({
					content: lang.ranks_config_awaiting1_response,
					components: [roleSelectRow, createReturnRow()]
				});

				let response1;
				try {
					response1 = await awaiting.awaitMessageComponent({
						time: 600_000,
						componentType: ComponentType.RoleSelect
					});
				} catch {
					await message.edit({
						content: null,
						embeds: [createRankRolesEmbed(currentPage)],
						components: [createActionRow()]
					});
					return;
				}

				const selectedRole = response1.roles.first();
				if (!selectedRole) return;

				let rolePermissions = new PermissionsBitField((selectedRole as Role).permissions);
				let roleDangerousPermissions: string[] = [];

				for (const perm of client.func.method.getDangerousPermissions(lang)) {
					if (rolePermissions.has(perm.flag)) {
						roleDangerousPermissions.push(perm.name);
					}
				}

				const response2 = await iHorizonModalResolve({
					title: lang.ranks_config_add_modal_title,
					customId: 'level_input_modal',
					deferUpdate: false,
					fields: [
						{
							customId: 'level_input',
							label: lang.ranks_config_add_modal_fields1_placeholder,
							style: TextInputStyle.Short,
							required: true,
							minLength: 1,
							maxLength: 4,
						}
					]
				}, response1);

				const levelInput = response2?.fields.getTextInputValue('level_input') || "";

				const level = parseInt(levelInput.trim());
				if (isNaN(level) || level <= 0) {
					await response2?.reply({
						content: lang.ranks_config_add_invalid_level,
						ephemeral: true
					});

					await message.edit({
						content: null,
						embeds: [createRankRolesEmbed(currentPage)],
						components: [createActionRow()]
					});
					return;
				}

				if (currentRoles.find((r) => r === selectedRole.id)) {
					await response2?.reply({
						content: lang.ranks_config_add_invalid_role.replace("{role}", selectedRole.toString()),
						ephemeral: true
					});
					await message.edit({
						content: null,
						embeds: [createRankRolesEmbed(currentPage)],
						components: [createActionRow()]
					});
					return;
				}

				if (selectedRole) {
					ranksConfig.ranksRoles[level.toString()] = selectedRole.id;
					await client.db.set(`${interaction.guild?.id}.GUILD.XP_LEVELING`, ranksConfig);

					await message.edit({
						content: null,
						embeds: [createRankRolesEmbed(currentPage)],
						components: [createActionRow()]
					});

					await response2?.reply({
						content: lang.ranks_config_add_command_work
							.replace("${selectedRole}", selectedRole.toString())
							.replace("${level}", level.toString()),
						ephemeral: true
					});

					if (roleDangerousPermissions.length > 0) {
						let _ = roleDangerousPermissions.join('\n');
						await response1.followUp({
							content: lang.ranks_config_add_command_warn
								.replace("${selectedRole}", selectedRole.toString())
								.replace("${_}", _),
							ephemeral: true
						});
					}
				}
				return;
			}

			// Remove Role Flow
			if (interaction2.customId === 'remove_role') {
				const roleEntries = Object.entries(ranksConfig.ranksRoles || {});

				if (roleEntries.length === 0) {
					await interaction2.reply({
						content: lang.ranks_config_remove_no_rank,
						ephemeral: true
					});

					await message.edit({
						content: null,
						embeds: [createRankRolesEmbed(currentPage)],
						components: [createActionRow()]
					});
					return;
				}

				const roleOptions = Object.entries(ranksConfig.ranksRoles || {}).map(([level, roleId]) =>
					new StringSelectMenuOptionBuilder()
						.setLabel(lang.ranks_config_var_level.replace("{level}", level))
						.setValue(level)
						.setDescription(lang.ranks_config_remove_string_menu_desc.replace("${level}", level))
				);

				const removeRoleRow = new ActionRowBuilder<StringSelectMenuBuilder>()
					.addComponents(
						new StringSelectMenuBuilder()
							.setCustomId('select_role_to_remove')
							.setPlaceholder(lang.ranks_config_remove_string_menu1_placeholder)
							.addOptions(roleOptions)
					);

				let awaiting = await interaction2.update({
					content: lang.ranks_config_remove_awaiting_response,
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

				const levelToRemove = response1.values[0];
				delete ranksConfig.ranksRoles[levelToRemove];

				await client.db.set(`${interaction.guild?.id}.GUILD.XP_LEVELING`, ranksConfig);

				await message.edit({
					content: null,
					embeds: [createRankRolesEmbed(currentPage)],
					components: [createActionRow()]
				});

				await response1.reply({
					content: lang.ranks_config_remove_command_work.replace("${levelToRemove}", levelToRemove),
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