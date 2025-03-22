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
	Client,
	EmbedBuilder,
	ApplicationCommandOptionType,
	ChatInputCommandInteraction,
	ApplicationCommandType,
	Message,
	ChannelType,
	Channel,
	GuildTextBasedChannel,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	ActionRowBuilder,
	ComponentType,
	TextInputStyle,
	RoleSelectMenuBuilder,
	StringSelectMenuInteraction,
	CacheType,
	PermissionsBitField,
	PermissionFlagsBits
} from 'discord.js'

import { Command } from '../../../../types/command.js';
import { LanguageData } from '../../../../types/languageData.js';
import { DatabaseStructure } from '../../../../types/database_structure.js';
import { iHorizonModalResolve } from '../../../core/functions/modalHelper.js';
import { isDiscordEmoji, isSingleEmoji } from '../../../core/functions/emojiChecker.js';

function generateSelectMenu(data: DatabaseStructure.RoleReactData, messageId: string, placeholder: string) {
	const dynamicSelectMenu = new StringSelectMenuBuilder()
		.setCustomId(`roleselect_roles%${messageId}`)
		.setPlaceholder(placeholder);

	data.forEach((item, index) => {
		const selectMenuOption = new StringSelectMenuOptionBuilder()
			.setLabel(item.label)
			.setValue(`role_${item.roleId}`);
		if (item.emoji && (isSingleEmoji(item.emoji) || isDiscordEmoji(item.emoji))) {
			selectMenuOption.setEmoji(item.emoji);
		}
		if (item.desc) {
			selectMenuOption.setDescription(item.desc);
		}
		dynamicSelectMenu.addOptions(selectMenuOption);
	});

	return dynamicSelectMenu;
}

async function getMessage(channel: GuildTextBasedChannel, messageId: string) {
	let fetchedMessage = null;
	try {
		fetchedMessage = await channel.messages.fetch(messageId);
	} catch (error) {
		fetchedMessage = null;
	}
	return fetchedMessage;
}

export const command: Command = {
	name: 'roleselect',
	description: 'Configure role selection for a specific message',
	description_localizations: {
		"fr": "Configurer la sélection de rôles pour un message spécifique"
	},
	aliases: ["selectreact"],
	options: [
		{
			name: 'channel',
			type: ApplicationCommandOptionType.Channel,
			description: "The channel containing the target message",
			description_localizations: {
				"fr": "Le salon où se trouve le message à configurer"
			},
			channel_types: [ChannelType.GuildText],
			required: true,
			permission: null
		},
		{
			name: 'messageid',
			type: ApplicationCommandOptionType.String,
			description: "Message ID to configure role selection",
			description_localizations: {
				"fr": "Identifiant du message à configurer pour la sélection de rôles"
			},
			required: true,
			permission: null
		},
	],
	category: 'rolereactions',
	permission: PermissionFlagsBits.Administrator,
	thinking: false,
	type: ApplicationCommandType.ChatInput,
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) {
			return;
		}


		const channel = interaction instanceof ChatInputCommandInteraction
			? interaction.options.getChannel("channel") as Channel
			: await client.func.method.channel(interaction, args!, 0) as Channel;

		const messageId = interaction instanceof ChatInputCommandInteraction
			? interaction.options.getString("messageid") as string
			: client.func.method.string(args!, 1) as string;

		// Validate message ID
		if (!messageId || messageId.length < 9) {
			await client.func.method.interactionSend(interaction, {
				content: lang.roleselect_invalid_message_id
			});
			return;
		}

		let fetchedMessage = await getMessage(channel as GuildTextBasedChannel, messageId);

		if (!fetchedMessage) {
			await client.func.method.interactionSend(interaction, {
				content: lang.roleselect_message_not_found
			});
			return;
		}

		// Fetch existing role select data
		let baseData: DatabaseStructure.RoleReactData = await client.db.get(`${interaction.guildId}.GUILD.ROLE_SELECT.${messageId}`) || [];
		let placeholder = lang.roleselect_default_placeholder;

		// Main selection menu
		const selectMenuChoice = new StringSelectMenuBuilder()
			.setCustomId("roleselect_main_menu")
			.setPlaceholder(lang.roleselect_menu1_placeholder)
			.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel(lang.roleselect_menu1_add)
					.setValue("add")
					.setEmoji("🔹"),
				new StringSelectMenuOptionBuilder()
					.setLabel(lang.roleselect_menu1_remove)
					.setValue("remove")
					.setEmoji("🔸"),
				new StringSelectMenuOptionBuilder()
					.setLabel(lang.roleselect_menu1_change_placeholder)
					.setValue("placeholder")
					.setEmoji("🏷️"),
				new StringSelectMenuOptionBuilder()
					.setLabel(lang.roleselect_menu1_save)
					.setValue("save")
					.setEmoji("💾"),
				new StringSelectMenuOptionBuilder()
					.setLabel(lang.roleselect_menu1_cancel)
					.setValue("cancel")
					.setEmoji("🚫")
			);

		const components: ActionRowBuilder<StringSelectMenuBuilder>[] = [
			new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenuChoice)
		];

		const embed = new EmbedBuilder()
			.setTitle(lang.roleselect_menu1_embed_title)
			.setDescription(lang.roleselect_menu1_embed_description)
			.setColor(0x2f3136);

		function updateConfiguration(data: DatabaseStructure.RoleReactData) {
			embed.setFields([]);

			data.forEach((item, index) => {
				embed.addFields({
					name: `[${item.emoji || lang.var_none}] ・ ${item.label}`,
					value: `${lang.var_roles}: ${interaction.guild?.roles.cache.get(item.roleId)?.toString() || lang.var_unknown}\n${lang.roleselect_modal1_fields3_label}: ${item.desc || lang.var_none}`,
					inline: false
				});
			});

			components.length = 1;
			if (data.length > 0) {
				components.push(
					new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(generateSelectMenu(data, messageId, placeholder))
				);
			}
		}
		updateConfiguration(baseData);

		const configMessage = await client.func.method.interactionSend(interaction, {
			embeds: [embed],
			components: components
		});

		const collector = configMessage.createMessageComponentCollector({
			componentType: ComponentType.StringSelect,
			time: 300_000, // 5 minutes
			filter: (x) => {
				if (x.customId.startsWith("roleselect_roles")) {
					x.deferUpdate();
					return false;
				}
				return true;
			}
		});

		collector.on("collect", async (interaction2) => {
			if (interaction2.user.id !== interaction.member?.user.id) {
				await interaction2.reply({
					content: lang.help_not_for_you,
					flags: [1 << 6]
				});
				return;
			}

			switch (interaction2.values[0]) {
				case "add":
					await handleAddRoleOption(interaction2);
					break;
				case "remove":
					await handleRemoveRoleOption(interaction2);
					break;
				case "save":
					await handleSaveConfiguration(interaction2);
					break;
				case "cancel":
					await handleCancelConfiguration(interaction2);
					break;
				case "placeholder":
					await handlePlaceholderConfiguration(interaction2);
					break;
			}
		});

		async function handleAddRoleOption(interaction2: StringSelectMenuInteraction<CacheType>) {
			const modal = await iHorizonModalResolve({
				title: lang.roleselect_modal1_title,
				customId: "roleselect_add_fields",
				fields: [
					{
						label: lang.roleselect_modal1_fields1_label,
						customId: "case_emoji",
						style: TextInputStyle.Short,
						placeHolder: lang.roleselect_modal1_fields1_placeholder,
						maxLength: 120,
						minLength: 1,
						required: false
					},
					{
						label: lang.roleselect_modal1_fields2_label,
						customId: "case_title",
						style: TextInputStyle.Short,
						maxLength: 50,
						minLength: 4,
						placeHolder: lang.roleselect_modal1_fields2_placeholder,
						required: true
					},
					{
						label: lang.roleselect_modal1_fields3_label,
						customId: "case_desc",
						maxLength: 120,
						minLength: 0,
						style: TextInputStyle.Paragraph,
						placeHolder: lang.roleselect_modal1_fields3_placeholder,
						required: false
					}
				],
				deferUpdate: false
			}, interaction2);

			const emoji = modal?.fields.getTextInputValue("case_emoji")?.trim() || undefined;
			const label = modal?.fields.getTextInputValue("case_title")?.trim()!;
			const desc = modal?.fields.getTextInputValue("case_desc")?.trim() || undefined;

			const roleSelectResponse = await modal?.reply({
				content: lang.roleselect_awaiting1_msg,
				components: [
					new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
						new RoleSelectMenuBuilder()
							.setCustomId('role_selection')
							.setPlaceholder(lang.roleselect_awaiting1_menu_placeholder)
							.setMaxValues(1)
					)
				],
				flags: [1 << 6]
			});

			const roleResponse = await modal?.channel?.awaitMessageComponent({
				componentType: ComponentType.RoleSelect,
				time: 60_000
			});

			if (roleResponse) {
				if (baseData.find(x => x.roleId === roleResponse.values[0])) {
					await roleResponse.reply({
						content: lang.roleselect_role_already_exist,
						flags: [1 << 6]
					});
					roleSelectResponse?.delete();
					updateConfiguration(baseData);
					return;
				}

				const newRoleOption: DatabaseStructure.RoleReactData[number] = {
					label,
					roleId: roleResponse.values[0]
				};

				if (emoji && (isSingleEmoji(emoji) || isDiscordEmoji(emoji))) {
					newRoleOption.emoji = emoji;
				}

				if (desc) newRoleOption.desc = desc;

				await roleResponse.deferUpdate();
				await roleSelectResponse?.delete()
				baseData.push(newRoleOption);

				updateConfiguration(baseData);
				await interaction2.editReply({
					embeds: [embed],
					components: components
				});
			}
		}

		async function handleRemoveRoleOption(interaction2: StringSelectMenuInteraction<CacheType>) {
			if (baseData.length === 0) {
				await interaction2.reply({
					content: lang.roleselect_no_role_found,
					flags: [1 << 6]
				});
				return;
			}

			baseData.pop();

			if (baseData.length === 0) {
				await interaction2.update({
					embeds: [],
					components: [components[0]]
				});

				await interaction2.followUp({
					content: lang.roleselect_all_role_removed,
					flags: [1 << 6]
				});
				return;
			}

			updateConfiguration(baseData);

			await interaction2.update({
				embeds: [embed],
				components: components
			});

			await interaction2.followUp({
				content: lang.roleselect_last_role_removed,
				flags: [1 << 6]
			});
		}

		async function handleSaveConfiguration(interaction2: StringSelectMenuInteraction<CacheType>) {
			try {
				await client.db.set(`${interaction.guildId}.GUILD.ROLE_SELECT.${messageId}`, baseData);
				collector.stop();

				let fetchedMessage = await getMessage(channel as GuildTextBasedChannel, messageId);

				if (baseData.length === 0) {
					fetchedMessage?.edit({
						components: []
					});
				} else {
					fetchedMessage?.edit({
						components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(generateSelectMenu(baseData, messageId, placeholder))]
					});
				}

				await interaction2.reply({
					content: lang.roleselect_save_command_ok,
					flags: [1 << 6]
				});
			} catch (error) {
				await interaction2.reply({
					content: lang.roleselect_failed_to_save_config,
					flags: [1 << 6]
				});
			}
		}

		async function handleCancelConfiguration(interaction2: StringSelectMenuInteraction<CacheType>) {
			await interaction2.reply({
				content: lang.roleselect_canceled_command_ok,
				flags: [1 << 6]
			});
			collector.stop();
		}

		async function handlePlaceholderConfiguration(interaction2: StringSelectMenuInteraction<CacheType>) {
			let modal2 = await iHorizonModalResolve({
				title: lang.roleselect_modal2_title,
				customId: "roleselect_placeholder",
				fields: [
					{
						label: lang.roleselect_modal2_label,
						customId: "placeholder",
						style: TextInputStyle.Short,
						placeHolder: lang.roleselect_modal2_placeholder,
						maxLength: 50,
						minLength: 8,
						required: true
					}
				],
				deferUpdate: true
			}, interaction2);

			placeholder = modal2?.fields.getTextInputValue("placeholder")?.trim()!;
			updateConfiguration(baseData);
			await interaction2.editReply({
				embeds: [embed],
				components: components
			});
		};

		collector.on('end', async () => {
			await configMessage.edit({
				embeds: [embed],
				components: []
			});
		});
	},
};