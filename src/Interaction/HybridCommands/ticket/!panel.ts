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
	CacheType,
	ChannelSelectMenuBuilder,
	ChannelType,
	ChatInputCommandInteraction,
	Client,
	ComponentType,
	EmbedBuilder,
	Guild,
	Message,
	MessageFlags,
	RoleSelectMenuBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuInteraction,
	StringSelectMenuOptionBuilder,
	TextInputStyle,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';

import { generatePassword } from '../../../core/functions/random.js';
import { iHorizonModalResolve } from '../../../core/functions/modalHelper.js';
import { isDiscordEmoji, isSingleEmoji } from '../../../core/functions/emojiChecker.js';
import { metasTable } from '../../../Events/client/ready.js';
import { SubCommand } from '../../../../types/command.js';

export interface TicketPanel {
	panelCode: string;
	relatedEmbedId: string | null;
	placeholder: string;
	category?: string;
	ticketChannelPanel?: string | null;
	config: {
		rolesToPing: string[];
		optionFields: TicketOption[];
		pingUser: boolean;
		form: TicketForms[];
		userSelectPanel: boolean;
		deleteButton: boolean;
		transcriptButton: boolean;
	};
}

export interface TicketOption {
	name: string;
	desc?: string;
	value: string;
	emoji?: string;
	categoryId?: string;
	panelId?: string;
	form?: TicketForms[];
	rolesToPing: string[];
}

export interface TicketForms {
	questionId: number;
	questionTitle: string;
	questionPlaceholder?: string;
}

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<'cached'> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		// Guard checks
		if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;

		if (await client.db.get(`${interaction.guildId}.GUILD.TICKET.disable`)) {
			await client.func.method.interactionSend(interaction, { content: lang.open_disabled_command });
			return;
		}

		// Récupération de l'ID du panel
		const panel_id =
			interaction instanceof ChatInputCommandInteraction
				? interaction.options.getString('panel_id')
				: client.func.method.string(args!, 0);

		// Chargement ou création du panel
		const baseData = (await client.db.get(`${interaction.guildId}.GUILD.TICKET_PANEL.${panel_id}`) || {
			panelCode: generatePassword({ length: 10, uppercase: true, numbers: true }),
			relatedEmbedId: null,
			category: null,
			placeholder: lang.ticket_panel_default_placeholder,
			config: {
				rolesToPing: [],
				optionFields: [],
				pingUser: true,
				form: [],
				userSelectPanel: true,
				deleteButton: true,
				transcriptButton: true,
			},
		}) as TicketPanel;

		const panelCode = baseData.panelCode;
		let isSaved = false;

		// Embed principal
		const panelEmbed = new EmbedBuilder()
			.setTitle(lang.ticket_panel_embed_title + panelCode)
			.setDescription(lang.ticket_panel_embed_desc)
			.setFields(
				{ name: lang.ticket_panel_saved_conf, value: isSaved ? '🟢' : '🔴', inline: true },
				{ name: lang.ticket_panel_related_embed, value: baseData.relatedEmbedId || lang.var_no_set, inline: true },
				{ name: lang.ticket_panel_channel_panel_embed_id, value: baseData.ticketChannelPanel || lang.var_no_set, inline: true },
				{ name: lang.ticket_panel_role_to_ping, value: formatRoles(baseData.config.rolesToPing, lang), inline: true },
				{ name: lang.ticket_panel_ping_user, value: baseData.config.pingUser ? '🟢' : '🔴', inline: true },
				{ name: lang.ticket_panel_placeholder, value: baseData.placeholder || lang.var_no_set, inline: true },
				{ name: lang.ticket_panel_category, value: formatCategory(baseData.category, interaction.guild), inline: true },
				{ name: lang.ticket_panel_option_fields, value: stringifyOptions(baseData.config.optionFields) || lang.var_no_set, inline: false },
				{ name: lang.ticket_panel_form, value: stringifyForm(baseData.config.form) || lang.var_no_set, inline: false },
				{ name: lang.ticket_panel_select_user, value: baseData.config.userSelectPanel ? '🟢' : '🔴', inline: true },
				{ name: lang.ticket_panel_button_delete, value: baseData.config.deleteButton ? '🟢' : '🔴', inline: true },
				{ name: lang.ticket_panel_button_transcript, value: baseData.config.transcriptButton ? '🟢' : '🔴', inline: true }
			);

		// Menu de sélection
		const panelSelect = new StringSelectMenuBuilder()
			.setCustomId('panelSelect')
			.setPlaceholder(lang.ticket_panel_panel_placeholder)
			.addOptions([
				new StringSelectMenuOptionBuilder().setLabel(lang.ticket_panel_panel_1_label).setValue('save'),
				new StringSelectMenuOptionBuilder().setLabel(lang.ticket_panel_panel_2_label).setValue('preview'),
				new StringSelectMenuOptionBuilder().setLabel(lang.ticket_panel_panel_3_label).setValue('change_embed'),
				new StringSelectMenuOptionBuilder().setLabel(lang.ticket_panel_panel_4_label).setValue('change_role'),
				new StringSelectMenuOptionBuilder().setLabel(lang.ticket_panel_panel_5_label).setValue('change_placeholder'),
				new StringSelectMenuOptionBuilder().setLabel(lang.ticket_panel_panel_6_label).setValue('change_category'),
				new StringSelectMenuOptionBuilder().setLabel(lang.ticket_panel_panel_10_label).setValue('change_category_2'),
				new StringSelectMenuOptionBuilder().setLabel(lang.ticket_panel_panel_7_label).setValue('change_ping'),
				new StringSelectMenuOptionBuilder().setLabel(lang.ticket_panel_panel_8_label).setValue('change_option'),
				new StringSelectMenuOptionBuilder().setLabel(lang.ticket_panel_panel_9_label).setValue('change_form'),
				new StringSelectMenuOptionBuilder().setLabel(lang.ticket_panel_panel_11_label).setValue('change_ticket_channel_panel'),
				new StringSelectMenuOptionBuilder().setLabel(lang.ticket_panel_panel_12_label).setValue('change_ticket_user_select_panel'),
				new StringSelectMenuOptionBuilder().setLabel(lang.ticket_panel_panel_13_label).setValue('change_ticket_button_delete_panel'),
				new StringSelectMenuOptionBuilder().setLabel(lang.ticket_panel_panel_14_label).setValue('change_ticket_button_transcript_panel'),
				new StringSelectMenuOptionBuilder().setLabel(lang.ticket_panel_panel_15_label).setValue('change_ticket_channel_panel_options'),
				new StringSelectMenuOptionBuilder().setLabel(lang.ticket_panel_panel_16_label).setValue('change_ticket_forms_options'),
				new StringSelectMenuOptionBuilder().setLabel(lang.ticket_panel_panel_17_label).setValue('change_role_to_ping_options')
			]);

		const sendButton = new ButtonBuilder()
			.setCustomId('send_embed')
			.setLabel(lang.ticket_panel_button_send)
			.setStyle(ButtonStyle.Primary)
			.setEmoji(client.iHorizon_Emojis.GreenTick);

		const components = [
			new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(panelSelect),
			new ActionRowBuilder<ButtonBuilder>().addComponents(sendButton),
		];

		const originalResponse = await client.func.method.interactionSend(interaction, {
			content: generateDetailedContent() || null,
			embeds: [panelEmbed],
			components,
		});

		if (interaction instanceof ChatInputCommandInteraction) {
			await interaction.followUp({ content: 'https://youtu.be/TehLPQ_WCwQ', flags: [1 << 6] });
		}

		const selectCollector = originalResponse.createMessageComponentCollector({
			componentType: ComponentType.StringSelect,
			time: 1_250_000 * 10,
		});

		const buttonCollector = originalResponse.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 1_250_000 * 10,
		});

		buttonCollector.on('collect', async (i) => {
			if (i.user.id !== interaction.member!.user.id) return i.reply({ flags: [1 << 6], content: lang.help_not_for_you });
			i.deferUpdate();
			if (i.customId === 'send_embed') await sendEmbed();
		});

		selectCollector.on('collect', async (i: StringSelectMenuInteraction) => {
			if (i.user.id !== interaction.member!.user.id)
				return i.reply({ flags: [1 << 6], content: lang.help_not_for_you });

			const choice = i.values[0];

			switch (choice) {
				case 'save': i.deferUpdate(); await save(); selectCollector.stop('legitEnd'); break;
				case 'preview': await preview(i); break;
				case 'change_embed': await changeEmbed(i); break;
				case 'change_role': i.deferUpdate(); await changeRole(); break;
				case 'change_ping': i.deferUpdate(); await changePing(); break;
				case 'change_option': i.deferUpdate(); await changeOption(); break;
				case 'change_category_2': i.deferUpdate(); await changeCategoryForOption(i); break;
				case 'change_form': i.deferUpdate(); await changeForm(); break;
				case 'change_placeholder': await changePlaceholder(i); break;
				case 'change_category': i.deferUpdate(); await changeCategory(); break;
				case 'change_ticket_channel_panel': await changeTicketChannelPanel(i); break;
				case 'change_ticket_user_select_panel': i.deferUpdate(); await changeTicketUserSelectPanel(); break;
				case 'change_ticket_button_delete_panel': i.deferUpdate(); await changeTicketButtonDeletePanel(); break;
				case 'change_ticket_button_transcript_panel': i.deferUpdate(); await changeTicketButtonTranscriptPanel(); break;
				case 'change_ticket_channel_panel_options': i.deferUpdate(); await changeTicketChannelPanelOptions(i); break;
				case 'change_ticket_forms_options': i.deferUpdate(); await changeTicketFormsOptions(i); break;
				case 'change_role_to_ping_options': i.deferUpdate(); await changeRoleToPingOptions(i); break;
			}
		});

		selectCollector.on('end', (_, reason) => {
			if (reason !== 'legitEnd') {
				originalResponse.edit({ components: [], embeds: [panelEmbed] });
			}
		});

		function formatRoles(roles: string[], lang: LanguageData) {
			return roles.length ? roles.map(r => `<@&${r}>`).join(' ') : lang.var_no_set;
		}

		function formatCategory(id: string | undefined, guild: Guild) {
			return id ? guild.channels.cache.get(id)?.toString() || lang.var_no_set : lang.var_no_set;
		}

		async function save() {
			await client.db.set(`${interaction.guildId}.GUILD.TICKET_PANEL.${panelCode}`, baseData);
			panelEmbed.data.fields![0].value = '🟢';
			isSaved = true;
			await originalResponse.edit({
				embeds: [panelEmbed],
				content: generateDetailedContent() || null,
				components: [
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setCustomId('saved')
							.setLabel('Saved')
							.setStyle(ButtonStyle.Success)
							.setEmoji(client.iHorizon_Emojis.Yes)
							.setDisabled(true)
					),
				],
			});
		}

		// Replace the stringifyOptions function with this improved version
		function stringifyOptions(options: TicketOption[]): string {
			if (!options.length) return '';
			let str = '```\n';
			options.forEach(opt => {
				str += `- ${opt.name}\n`;
				if (opt.desc) str += `  ┖ ${lang.ticket_panel_add_option_modal_field2_label}: ${opt.desc}\n`;
				if (opt.emoji) str += `  ┖ ${lang.ticket_panel_add_option_modal_field3_label}: ${opt.emoji}\n`;
				if (opt.categoryId) str += `  ┖ 📂: ${formatCategory(opt.categoryId, interaction.guild!)}\n`;
				if (opt.panelId) str += `  ┖ ${lang.ticket_panel_change_embed_modal_placeholder}: ${opt.panelId}\n`;
				if (opt.rolesToPing?.length >= 1) {
					str += `  ┖ ${lang.ticket_panel_role_to_ping}:\n`;
					for (let role of opt.rolesToPing) {
						let r = interaction.guild?.roles.cache.get(role);
						str += `     ┖ 🔹 ${role} (@${r?.name || lang.var_unknown})\n`
					}
					str += '\n';
				}

				if (opt.form?.length) {
					str += `  ┖ 📚 ${lang.var_form}:\n`;
					opt.form.forEach(f => {
						str += `     ┖ 🔹 ${f.questionTitle}\n`;
						if (f.questionPlaceholder) str += `       ┖ ${f.questionPlaceholder}\n`;
					});
				}
				str += '\n';
			});
			str += '```';

			// Check if the string exceeds Discord's field limit (1024 characters)
			if (str.length > 1024) {
				return 'Options list too long - check message content';
			}

			return str;
		}

		// Also replace the stringifyForm function
		function stringifyForm(forms: TicketForms[]): string {
			if (!forms.length) return '';
			let str = '```\n';
			forms.forEach((f, i) => {
				str += `${i} - ${f.questionTitle}\n`;
				if (f.questionPlaceholder) str += `  ┖ ${f.questionPlaceholder}\n`;
				str += '\n';
			});
			str += '```';

			// Check if the string exceeds Discord's field limit
			if (str.length > 1024) {
				return 'Forms list too long - check message content';
			}

			return str;
		}

		// Create a function to generate detailed content when needed
		function generateDetailedContent(): string {
			let content = '';

			// Check if options are too long for embed
			const optionsStr = stringifyOptionsDetailed(baseData.config.optionFields);
			if (optionsStr.length > 1024) {
				content += `**${lang.ticket_panel_option_fields}:**\n${optionsStr}\n\n`;
			}

			// Check if forms are too long for embed
			const formsStr = stringifyFormDetailed(baseData.config.form);
			if (formsStr.length > 1024) {
				content += `**${lang.ticket_panel_form}:**\n${formsStr}\n\n`;
			}

			return content;
		}

		function stringifyOptionsDetailed(options: TicketOption[]): string {
			if (!options.length) return lang.var_no_set;
			let str = '```\n';
			options.forEach(opt => {
				str += `- ${opt.name}\n`;
				if (opt.desc) str += `  ┖ ${lang.ticket_panel_add_option_modal_field2_label}: ${opt.desc}\n`;
				if (opt.emoji) str += `  ┖ ${lang.ticket_panel_add_option_modal_field3_label}: ${opt.emoji}\n`;
				if (opt.categoryId) str += `  ┖ 📂: ${formatCategory(opt.categoryId, interaction.guild!)}\n`;
				if (opt.panelId) str += `  ┖ ${lang.ticket_panel_change_embed_modal_placeholder}: ${opt.panelId}\n`;
				if (opt.form?.length) {
					str += `  ┖ 📚 ${lang.var_form}:\n`;
					opt.form.forEach(f => {
						str += `     ┖ 🔹 ${f.questionTitle}\n`;
						if (f.questionPlaceholder) str += `       ┖ ${f.questionPlaceholder}\n`;
					});
				}
				str += '\n';
			});
			return str + '```';
		}

		function stringifyFormDetailed(forms: TicketForms[]): string {
			if (!forms.length) return lang.var_no_set;
			let str = '```\n';
			forms.forEach((f, i) => {
				str += `${i} - ${f.questionTitle}\n`;
				if (f.questionPlaceholder) str += `  ┖ ${f.questionPlaceholder}\n`;
				str += '\n';
			});
			return str + '```';
		}


		async function sendEmbed() {
			if (baseData.config.optionFields.length === 0) return originalResponse.edit({ content: lang.ticket_panel_need_1_option, embeds: [panelEmbed], components });

			// if (!isSaved) return originalResponse.edit({ content: lang.ticket_panel_need_save_config, components });
			await client.db.set(`${interaction.guildId}.GUILD.TICKET_PANEL.${panelCode}`, baseData);
			isSaved = true;

			const channelSelect = new ChannelSelectMenuBuilder()
				.setCustomId('send_embed')
				.setPlaceholder(lang.ticket_panel_select_channel_to_send)
				.setChannelTypes(ChannelType.GuildText);

			const msg = await originalResponse.edit({
				components: [new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(channelSelect)],
				embeds: [],
				content: lang.ticket_panel_select_channel_to_send,
			});

			const collector = msg.createMessageComponentCollector({ componentType: ComponentType.ChannelSelect, time: 60_000 });
			collector.on('collect', async i => {
				if (i.user.id !== interaction.member!.user.id) return i.reply({ flags: [1 << 6], content: lang.help_not_for_you });
				const channel = await i.guild?.channels.fetch(i.values[0]);
				if (!channel?.isSendable()) return i.reply({ flags: [1 << 6], content: lang.ticket_panel_channel_error });

				const embedData = await metasTable.get(`EMBED.${baseData.relatedEmbedId}`);
				if (!embedData?.embedSource) return i.reply({ flags: [1 << 6], content: lang.ticket_panel_related_embed_dont_exist });

				const embed = EmbedBuilder.from(embedData.embedSource);
				const selectMenu = new StringSelectMenuBuilder()
					.setCustomId('ticket-open-selection-v2')
					.setPlaceholder(baseData.placeholder)
					.addOptions(baseData.config.optionFields.map(opt => {
						const builder = new StringSelectMenuOptionBuilder()
							.setLabel(opt.name)
							.setValue(opt.value);
						if (opt.desc) builder.setDescription(opt.desc.substring(0, 100));
						if (opt.emoji) builder.setEmoji(opt.emoji);
						return builder;
					}));

				let sentPanel = await channel.send({ embeds: [embed], components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)] });
				await client.db.set(`${interaction.guildId}.GUILD.TICKET_PANEL.${sentPanel.id}`, panelCode);

				collector.stop('legitEnd');
				selectCollector.stop('legitEnd');
				await originalResponse.edit({
					content: lang.ticket_panel_saved_and_sended_panel.replace("${panelCode}", panelCode).replace("${channel.toString()}", channel.toString()),
					embeds: [],
					files: [],
					components: []
				});
			});
		}

		async function changeTicketFormsOptions(i: StringSelectMenuInteraction) {
			if (baseData.config.optionFields.length === 0) {
				return originalResponse.edit({
					content: lang.ticket_panel_remove_option_empty,
					embeds: [panelEmbed],
					components,
				});
			}

			const select = new StringSelectMenuBuilder()
				.setCustomId('select_option_form')
				.setPlaceholder(lang.var_chose_option)
				.addOptions(baseData.config.optionFields.map((opt, idx) =>
					new StringSelectMenuOptionBuilder()
						.setLabel(opt.name)
						.setValue(idx.toString())
				));

			const msg = await originalResponse.edit({
				components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
				embeds: [],
				content: lang.ticket_panel_chose_option_to_form,
			});

			const collector = msg.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 300_000 });
			collector.on('collect', async (subI) => {
				if (subI.user.id !== interaction.member!.user.id) return subI.reply({ flags: [1 << 6], content: lang.help_not_for_you });

				const idx = parseInt(subI.values[0]);
				const option = baseData.config.optionFields[idx];
				if (isNaN(idx) || !baseData.config.optionFields[idx]) {
					await subI.reply({ content: lang.ticket_panel_option_invalid, flags: MessageFlags.Ephemeral });
					return;
				}

				subI.deferUpdate();
				// Sous-menu pour ajouter/modifier/supprimer
				const actionSelect = new StringSelectMenuBuilder()
					.setCustomId('form_action')
					.setPlaceholder(lang.var_action)
					.addOptions(
						new StringSelectMenuOptionBuilder().setLabel(lang.ticket_panel_add_a_question).setValue('add'),
						new StringSelectMenuOptionBuilder().setLabel(lang.ticket_panel_remove_a_question).setValue('remove')
					);

				await originalResponse.edit({
					components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(actionSelect)],
					content: lang.ticket_panel_manage_form_title.replace("${option.name}", option.name),
				});

				collector.stop();
				const actionCollector = originalResponse.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60_000 * 15 });
				actionCollector.on('collect', async (actionI) => {
					if (actionI.user.id !== interaction.member!.user.id) {
						return actionI.reply({ flags: [1 << 6], content: lang.help_not_for_you });
					}

					if (actionI.values[0] === 'add') {
						if (!option.form) option.form = [];

						if (option.form.length >= 3) {
							return actionI.reply({ content: lang.ticket_panel_add_form_max_3, flags: MessageFlags.Ephemeral });
						}

						const modal = await iHorizonModalResolve({
							customId: 'add_form_opt',
							title: lang.ticket_panel_add_a_question,
							fields: [
								{ customId: 'title', label: lang.var_title, style: TextInputStyle.Short, required: true, maxLength: 128 },
								{ customId: 'placeholder', label: lang.roleselect_modal2_label, style: TextInputStyle.Short, required: false, maxLength: 100 },
							],
							deferUpdate: true
						}, actionI);

						if (!modal) return;

						const title = modal.fields.getTextInputValue('title');
						const placeholder = modal.fields.getTextInputValue('placeholder');

						option.form.push({
							questionId: option.form.length,
							questionTitle: title,
							questionPlaceholder: placeholder,
						});

						isSaved = false;
						panelEmbed.data.fields![0].value = '🔴';
						panelEmbed.data.fields![7].value = stringifyOptions(baseData.config.optionFields) || lang.var_no_set;
						await originalResponse.edit({
							embeds: [panelEmbed], components, content: generateDetailedContent() || null,
						});
						actionCollector.stop('legitEnd');
					} else if (actionI.values[0] === 'remove') {
						if (!option.form || option.form.length === 0) {
							await originalResponse.edit({
								embeds: [panelEmbed], components, content: generateDetailedContent() || null,
							});
							actionCollector.stop('legitEnd');

							return actionI.reply({ content: lang.ticket_panel_no_question_to_delete, flags: MessageFlags.Ephemeral });
						}

						const formSelect = new StringSelectMenuBuilder()
							.setCustomId('remove_form_opt')
							.setPlaceholder(lang.ticket_panel_chose_a_question)
							.addOptions(option.form.map((f, i) =>
								new StringSelectMenuOptionBuilder().setLabel(f.questionTitle).setValue(i.toString())
							));

						actionI.deferUpdate();

						await originalResponse.edit({
							components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(formSelect)],
							content: lang.ticket_panel_select_question_to_delete,
						});

						actionCollector.stop();

						const removeCollector = originalResponse.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60_000 * 5 });
						removeCollector.on('collect', async (rmI) => {
							removeCollector.stop();
							rmI.deferUpdate();
							if (rmI.user.id !== interaction.member!.user.id) return rmI.reply({ flags: [1 << 6], content: lang.help_not_for_you });
							const fid = parseInt(rmI.values[0]);
							option.form!.splice(fid, 1);
							isSaved = false;
							panelEmbed.data.fields![0].value = '🔴';
							panelEmbed.data.fields![7].value = stringifyOptions(baseData.config.optionFields) || lang.var_no_set;
							await originalResponse.edit({
								embeds: [panelEmbed], components, content: generateDetailedContent() || null,
							});
							removeCollector.stop('legitEnd');
							actionCollector.stop('legitEnd');
						});
					}
				});
			});
		}

		async function changeCategoryForOption(i: StringSelectMenuInteraction<CacheType>) {
			// get the option with string select menu
			if (baseData.config.optionFields.length === 0) {
				return originalResponse.edit({
					content: lang.ticket_panel_remove_option_empty,
					embeds: [panelEmbed],
					components,
				});
			}

			const select = new StringSelectMenuBuilder()
				.setCustomId("change_category_for_option")
				.setPlaceholder(lang.ticket_panel_option_change_category)
				.addOptions(
					...baseData.config.optionFields.map((x, i) => {
						return new StringSelectMenuOptionBuilder()
							.setLabel(x.name)
							.setValue(i.toString())
					})
				);

			const select_interaction = await originalResponse.edit({
				components: [
					new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)
				],
				embeds: [],
				content: lang.ticket_panel_option_change_category
			});

			// collector for string select
			const select_collector = select_interaction.createMessageComponentCollector({
				componentType: ComponentType.StringSelect,
				time: 60_000 * 5,
			});

			select_collector.on("collect", async (i) => {
				if (i.user.id !== interaction.member!.user.id) {
					return i.reply({ flags: [1 << 6], content: lang.help_not_for_you });
				};

				const choice = i.values[0];
				const option = baseData.config.optionFields[parseInt(choice)];

				await i.deferUpdate();


				const channelSelect = new ChannelSelectMenuBuilder()
					.setCustomId("change_category_for_option")
					.setChannelTypes(ChannelType.GuildCategory)
					.setPlaceholder(lang.ticket_panel_change_category_channelSelect_placeholder);

				const send_embed_interaction = await originalResponse.edit({
					components: [
						new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(channelSelect)
					],
					embeds: [],
					content: lang.ticket_panel_change_category_channelSelect_placeholder
				});

				// collector for channel select
				const channelCollector = send_embed_interaction.createMessageComponentCollector({
					componentType: ComponentType.ChannelSelect,
					time: 60_000,
				});

				channelCollector.on("collect", async (i) => {
					if (i.user.id !== interaction.member!.user.id) {
						return i.reply({ flags: [1 << 6], content: lang.help_not_for_you });
					};

					const category = i.values[0];
					await i.deferUpdate();

					option.categoryId = category;
					isSaved = false;
					panelEmbed.data.fields![0].value = "🔴";

					panelEmbed.data.fields![7].value = stringifyOptions(baseData.config.optionFields) || lang.var_no_set;

					await originalResponse.edit({
						embeds: [panelEmbed],
						components,
						content: generateDetailedContent() || null,
					});

					channelCollector.stop("legitEnd");
				});

				select_collector.stop("legitEnd");
			});
		}

		async function changeCategory() {
			const channelSelect = new ChannelSelectMenuBuilder()
				.setCustomId("change_category")
				.setChannelTypes(ChannelType.GuildCategory)
				.setPlaceholder(lang.ticket_panel_change_category_channelSelect_placeholder);


			const send_embed_interaction = await originalResponse.edit({
				components: [
					new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(channelSelect)
				],
				embeds: [],
				content: lang.ticket_panel_select_channel_to_send
			});

			// collector for channel select
			const channelCollector = send_embed_interaction.createMessageComponentCollector({
				componentType: ComponentType.ChannelSelect,
				time: 60_000,
			});

			channelCollector.on("collect", async (i) => {
				if (i.user.id !== interaction.member!.user.id) {
					return i.reply({ flags: [1 << 6], content: lang.help_not_for_you });
				};

				const category = i.values[0];
				await i.deferUpdate();

				const fetchChannel = await i.guild?.channels.fetch(category)!;

				baseData.category = category;
				isSaved = false;
				panelEmbed.data.fields![0].value = "🔴";

				panelEmbed.data.fields![6].value = fetchChannel!.toString();

				await originalResponse.edit({
					embeds: [panelEmbed],
					components,
				});

				channelCollector.stop("legitEnd");
			});
		}

		async function changePlaceholder(i: StringSelectMenuInteraction<CacheType>) {
			const modal = await iHorizonModalResolve({
				customId: "change_placeholder",
				deferUpdate: false,
				title: lang.ticket_panel_change_placeholder_modal_title,
				fields: [
					{
						customId: "placeholder",
						label: lang.ticket_panel_change_placeholder_modal_placeholder,
						style: TextInputStyle.Short,
						required: true,
						maxLength: 100,
						minLength: 4
					}
				]
			}, i);

			if (!modal) return;

			const placeholder = modal.fields.getTextInputValue("placeholder");

			baseData.placeholder = placeholder;
			isSaved = false;
			panelEmbed.data.fields![0].value = "🔴";

			panelEmbed.data.fields![5].value = baseData.placeholder;

			modal.deferUpdate();

			await originalResponse.edit({
				embeds: [panelEmbed],
				components
			});
		}

		async function changeRole() {
			const roleSelect = new RoleSelectMenuBuilder()
				.setPlaceholder(lang.ticket_panel_change_role_roleSelect_placeholder)
				.setCustomId("change_role")
				.setMaxValues(10)
				.setMinValues(0)
				.addDefaultRoles(baseData.config.rolesToPing)
				;

			const change_role_interaction = await originalResponse.edit({
				components: [
					new ActionRowBuilder<RoleSelectMenuBuilder>()
						.addComponents(
							roleSelect
						)
				],
				embeds: [],
				content: lang.ticket_panel_change_role_interaction_content
			});

			// collector for role select
			const roleCollector = change_role_interaction.createMessageComponentCollector({
				componentType: ComponentType.RoleSelect,
				time: 60_000,
			});

			roleCollector.on("collect", async (i) => {
				if (i.user.id !== interaction.member!.user.id) {
					return i.reply({ flags: [1 << 6], content: lang.help_not_for_you });
				};

				baseData.config.rolesToPing = i.values;
				isSaved = false;
				panelEmbed.data.fields![0].value = "🔴";

				// modify the panelEmbed to show the new role
				panelEmbed.data.fields![3].value = baseData.config.rolesToPing.length >= 1 ? baseData.config.rolesToPing.map(x => `<@&${x}>`).join("") : lang.var_no_set;

				// send the new panelEmbed
				originalResponse.edit({
					embeds: [panelEmbed],
					components,
					content: null
				});

				await i.deferUpdate();
				roleCollector.stop("legitEnd");
			});

			roleCollector.on("end", async (_, reason) => {
				if (reason === "legitEnd") return;

				await change_role_interaction.edit({
					components,
					embeds: [panelEmbed]
				});
			});
		}

		async function changePing() {
			baseData.config.pingUser = !baseData.config.pingUser;
			isSaved = false;
			panelEmbed.data.fields![0].value = "🔴";

			panelEmbed.data.fields![4].value = baseData.config.pingUser ? "🟢" : "🔴";

			await originalResponse.edit({
				embeds: [panelEmbed],
				components,
			});
		}

		async function changeEmbed(i: StringSelectMenuInteraction<CacheType>) {
			const modal = await iHorizonModalResolve({
				customId: "change_embed",
				deferUpdate: false,
				title: lang.ticket_panel_change_embed_modal_placeholder,
				fields: [
					{
						customId: "embed_id",
						label: lang.ticket_panel_change_embed_modal_placeholder,
						style: TextInputStyle.Short,
						required: true,
						maxLength: 20,
						minLength: 0
					}
				]
			}, i);

			if (!modal) return;

			// get the embed id
			const embed_id = modal.fields.getTextInputValue("embed_id");

			// check if the embed exists
			const embed = await metasTable.get(`EMBED.${embed_id}`);

			if (!embed) {
				return modal.reply({ flags: [1 << 6], content: lang.ticket_panel_change_embed_dont_exist });
			}

			baseData.relatedEmbedId = embed_id;
			isSaved = false;
			panelEmbed.data.fields![0].value = "🔴";

			panelEmbed.data.fields![1].value = baseData.relatedEmbedId;
			modal.deferUpdate();

			await originalResponse.edit({
				embeds: [panelEmbed],
				components,
			});

		}

		async function changeTicketChannelPanel(i: StringSelectMenuInteraction<CacheType>) {
			const modal = await iHorizonModalResolve({
				customId: "change_embed2",
				deferUpdate: false,
				title: lang.ticket_panel_change_embed_modal_placeholder,
				fields: [
					{
						customId: "embed_id",
						label: lang.ticket_panel_change_embed_modal_placeholder,
						style: TextInputStyle.Short,
						required: true,
						maxLength: 20,
						minLength: 0
					}
				]
			}, i);

			if (!modal) return;

			i.followUp({
				content: lang.ticket_panel_tip_about_variable1.replace("${client.iHorizon_Emojis.VC_OpenChat}", client.iHorizon_Emojis.VC_OpenChat),
				flags: MessageFlags.Ephemeral
			})

			// get the embed id
			let embed_id: string | undefined = modal.fields.getTextInputValue("embed_id");

			// check if the embed exists
			const embed = await metasTable.get(`EMBED.${embed_id}`);

			if (!embed) {
				modal.reply({ flags: [1 << 6], content: lang.ticket_panel_change_embed_dont_exist });
				embed_id = undefined;
			}

			baseData.ticketChannelPanel = embed_id;
			isSaved = false;
			panelEmbed.data.fields![0].value = "🔴";

			panelEmbed.data.fields![2].value = baseData.ticketChannelPanel || lang.var_no_set;
			modal.deferUpdate();

			await originalResponse.edit({
				embeds: [panelEmbed],
				components,
				content: generateDetailedContent() || null,
			});
		}

		async function changeOption() {
			const select = new StringSelectMenuBuilder()
				.setCustomId("change_option")
				.setPlaceholder(lang.ticket_panel_change_option_select_placeholder)
				.addOptions(
					new StringSelectMenuOptionBuilder()
						.setLabel(lang.ticket_panel_change_option_select_1_label)
						.setValue("add"),
					new StringSelectMenuOptionBuilder()
						.setLabel(lang.ticket_panel_change_option_select_2_label)
						.setValue("remove"),
				);

			const select_interaction = await originalResponse.edit({
				components: [
					new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)
				],
				embeds: [],
				content: lang.ticket_panel_change_option_interaction_content
			});

			// collector for string select
			const select_collector = select_interaction.createMessageComponentCollector({
				componentType: ComponentType.StringSelect,
				time: 60_000,
			});

			select_collector.on("collect", async (i) => {
				if (i.user.id !== interaction.member!.user.id) {
					return i.reply({ flags: [1 << 6], content: lang.help_not_for_you });
				};

				const choice = i.values[0];

				switch (choice) {
					case "add":
						await add_option(i);
						select_collector.stop("legitEnd");
						break;
					case "remove":
						i.deferUpdate();
						await remove_option();
						select_collector.stop("legitEnd");
						break;
				}

			});

			select_collector.on("end", async (_, reason) => {
				if (reason === "legitEnd") return;

				await select_interaction.edit({
					components,
					embeds: [panelEmbed]
				});
			});
		}

		async function add_option(i: StringSelectMenuInteraction<CacheType>) {
			if (baseData.config.optionFields.length >= 10) {
				await originalResponse.edit({
					embeds: [panelEmbed],
					content: generateDetailedContent() || null,
					components
				});

				return i.reply({ flags: [1 << 6], content: lang.ticket_panel_add_option_max_10 });
			}

			const modal = await iHorizonModalResolve({
				customId: "add_option",
				deferUpdate: false,
				title: lang.ticket_panel_add_option_modal_title,
				fields: [
					{
						customId: "name",
						label: lang.ticket_panel_add_option_modal_field1_label,
						style: TextInputStyle.Short,
						required: true,
						maxLength: 128,
						minLength: 4
					},
					{
						customId: "desc",
						label: lang.ticket_panel_add_option_modal_field2_label,
						style: TextInputStyle.Short,
						required: false,
						maxLength: 130,
						minLength: 4
					},
					{
						customId: "emoji",
						label: lang.ticket_panel_add_option_modal_field3_label,
						style: TextInputStyle.Short,
						required: false,
						maxLength: 1000,
						minLength: 1
					}
				]
			}, i);

			if (!modal) return;

			const name = modal.fields.getTextInputValue("name");
			const desc = modal.fields.getTextInputValue("desc");
			let emoji: string | undefined = modal.fields.getTextInputValue("emoji");

			// Check emoji before push
			if (!isSingleEmoji(emoji) && !isDiscordEmoji(emoji)) {
				emoji = undefined;
			}

			baseData.config.optionFields.push({
				name,
				desc,
				emoji,
				value: (baseData.config.optionFields.length - 1).toString(),
				rolesToPing: []
			});

			isSaved = false;
			panelEmbed.data.fields![0].value = "🔴";

			panelEmbed.data.fields![7].value = stringifyOptions(baseData.config.optionFields) || lang.var_no_set;

			modal.deferUpdate();

			await originalResponse.edit({
				embeds: [panelEmbed],
				components,
				content: generateDetailedContent() || null,
			});
		}

		async function remove_option() {
			if (baseData.config.optionFields.length === 0) {
				return originalResponse.edit({
					content: lang.ticket_panel_remove_option_empty,
					embeds: [panelEmbed],
					components
				});
			}

			const select = new StringSelectMenuBuilder()
				.setCustomId("remove_option")
				.setPlaceholder(lang.ticket_panel_remove_option_select_placeholder)
				.addOptions(
					...baseData.config.optionFields.map((x, i) => {
						return new StringSelectMenuOptionBuilder()
							.setLabel(x.name)
							.setValue(i.toString())
					})
				);

			const select_interaction = await originalResponse.edit({
				components: [
					new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)
				],
				embeds: [],
				content: lang.ticket_panel_rempve_option_interaction_content
			});

			// collector for string select
			const select_collector = select_interaction.createMessageComponentCollector({
				componentType: ComponentType.StringSelect,
				time: 60_000,
			});

			select_collector.on("collect", async (i) => {
				if (i.user.id !== interaction.member!.user.id) {
					return i.reply({ flags: [1 << 6], content: lang.help_not_for_you });
				};

				const choice = i.values[0];
				baseData.config.optionFields.splice(parseInt(choice), 1);

				isSaved = false;
				panelEmbed.data.fields![0].value = "🔴";

				panelEmbed.data.fields![7].value = stringifyOptions(baseData.config.optionFields) || lang.var_no_set;

				await i.deferUpdate();

				await originalResponse.edit({
					embeds: [panelEmbed],
					components,
					content: null
				});

				select_collector.stop("legitEnd");
			});

			select_collector.on("end", async (_, reason) => {
				if (reason === "legitEnd") return;

				await select_interaction.edit({
					components,
					embeds: [panelEmbed]
				});
			})
		};

		async function changeForm() {
			const select = new StringSelectMenuBuilder()
				.setCustomId("change_form")
				.setPlaceholder(lang.ticket_panel_change_option_select_placeholder)
				.addOptions(
					new StringSelectMenuOptionBuilder()
						.setLabel(lang.ticket_panel_change_form_select_placeholder_1)
						.setValue("add"),
					new StringSelectMenuOptionBuilder()
						.setLabel(lang.ticket_panel_change_form_select_placeholder_2)
						.setValue("remove"),
				);

			const select_interaction = await originalResponse.edit({
				components: [
					new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)
				],
				embeds: [],
				content: lang.ticket_panel_change_form_interaction_content
			});

			// collector for string select
			const select_collector = select_interaction.createMessageComponentCollector({
				componentType: ComponentType.StringSelect,
				time: 60_000,
			});

			select_collector.on("collect", async (i) => {
				if (i.user.id !== interaction.member!.user.id) {
					return i.reply({ flags: [1 << 6], content: lang.help_not_for_you });
				};

				const choice = i.values[0];

				switch (choice) {
					case "add":
						await add_form(i);
						select_collector.stop("legitEnd");
						break;
					case "remove":
						i.deferUpdate();
						await remove_form();
						select_collector.stop("legitEnd");
						break;
				}

			});

			select_collector.on("end", async (_, reason) => {
				if (reason === "legitEnd") return;

				await select_interaction.edit({
					components,
					embeds: [panelEmbed]
				});
			});
		}

		async function add_form(i: StringSelectMenuInteraction<CacheType>) {
			if (baseData.config.form.length >= 3) {
				await originalResponse.edit({
					embeds: [panelEmbed],
					components,
					content: generateDetailedContent() || null,
				});

				return i.reply({ flags: [1 << 6], content: lang.ticket_panel_add_form_max_3 });
			}

			const modal = await iHorizonModalResolve({
				customId: "add_form",
				deferUpdate: false,
				title: lang.ticket_panel_add_form_modal_title,
				fields: [
					{
						customId: "questionTitle",
						label: lang.ticket_panel_add_form_modal_field1_label,
						style: TextInputStyle.Short,
						required: true,
						maxLength: 128,
						minLength: 4
					},
					{
						customId: "questionPlaceholder",
						label: lang.ticket_panel_add_form_modal_field2_label,
						style: TextInputStyle.Short,
						required: false,
						maxLength: 130,
						minLength: 4
					}
				]
			}, i);

			if (!modal) return;

			const questionTitle = modal.fields.getTextInputValue("questionTitle");
			const questionPlaceholder = modal.fields.getTextInputValue("questionPlaceholder");

			baseData.config.form.push({
				questionId: baseData.config.form.length,
				questionTitle,
				questionPlaceholder
			});

			isSaved = false;
			panelEmbed.data.fields![0].value = "🔴";

			panelEmbed.data.fields![8].value = stringifyForm(baseData.config.form) || lang.var_no_set;

			modal.deferUpdate();

			await originalResponse.edit({
				embeds: [panelEmbed],
				components,
				content: generateDetailedContent() || null,
			});
		}

		async function remove_form() {
			if (baseData.config.form.length === 0) {
				await originalResponse.edit({
					embeds: [panelEmbed],
					components,
					content: generateDetailedContent() || null,
				});

				return originalResponse.edit({
					content: lang.ticket_panel_remove_option_empty,
					components,
				});
			}

			const select = new StringSelectMenuBuilder()
				.setCustomId("remove_form")
				.setPlaceholder(lang.ticket_panel_remove_option_select_placeholder)
				.addOptions(
					...baseData.config.form.map((x, i) => {
						return new StringSelectMenuOptionBuilder()
							.setLabel(x.questionTitle)
							.setValue(i.toString())
					})
				);

			const select_interaction = await originalResponse.edit({
				components: [
					new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)
				],
				embeds: [],
				content: lang.ticket_panel_rempve_option_interaction_content
			});

			// collector for string select
			const select_collector = select_interaction.createMessageComponentCollector({
				componentType: ComponentType.StringSelect,
				time: 60_000,
			});

			select_collector.on("collect", async (i) => {
				if (i.user.id !== interaction.member!.user.id) {
					return i.reply({ flags: [1 << 6], content: lang.help_not_for_you });
				};

				const choice = i.values[0];
				baseData.config.form.splice(parseInt(choice), 1);

				isSaved = false;
				panelEmbed.data.fields![0].value = "🔴";

				panelEmbed.data.fields![8].value = stringifyForm(baseData.config.form) || lang.var_no_set;

				await i.deferUpdate();

				await originalResponse.edit({
					embeds: [panelEmbed],
					components,
					content: generateDetailedContent() || null,
				});

				select_collector.stop("legitEnd");
			});

			select_collector.on("end", async (_, reason) => {
				if (reason === "legitEnd") return;

				await select_interaction.edit({
					components,
					embeds: [panelEmbed]
				});
			})
		}

		async function preview(i: StringSelectMenuInteraction<CacheType>) {
			const relatedEmbed = await metasTable.get(`EMBED.${baseData.relatedEmbedId}`);

			if (!relatedEmbed || !relatedEmbed.embedSource) {
				await originalResponse.edit({
					content: generateDetailedContent() || null,
					components,
					embeds: [panelEmbed]
				});

				return i.reply({ flags: [1 << 6], content: lang.ticket_panel_related_embed_dont_exist });
			}

			// if 0 option fields
			if (baseData.config.optionFields.length === 0) {
				return i.reply({ flags: [1 << 6], content: lang.ticket_panel_need_1_option });
			}

			const embed = EmbedBuilder.from(relatedEmbed.embedSource);

			const selectMenu = new StringSelectMenuBuilder()
				.setCustomId("ticket-open-selection-v2-preview")
				.setPlaceholder(baseData.placeholder)
				.addOptions(
					baseData.config.optionFields.map(x => {
						const optionBuilder = new StringSelectMenuOptionBuilder()
							.setLabel(x.name)
							.setValue(x.value);

						if (x.desc) {
							optionBuilder.setDescription(x.desc.substring(0, 100));
						}

						if (x.emoji) {
							optionBuilder.setEmoji(x.emoji);
						}

						return optionBuilder;
					})
				);

			i.reply({
				embeds: [embed],
				content: lang.ticket_panel_preview_message,
				components: [
					new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)
				],
				flags: [1 << 6]
			})
		}

		async function changeTicketUserSelectPanel() {
			baseData.config.userSelectPanel = !baseData.config.userSelectPanel;
			isSaved = false;
			panelEmbed.data.fields![0].value = "🔴";

			panelEmbed.data.fields![9].value = baseData.config.userSelectPanel ? "🟢" : "🔴";

			await originalResponse.edit({
				embeds: [panelEmbed],
				components,
			});
		}

		async function changeTicketButtonDeletePanel() {
			baseData.config.deleteButton = !baseData.config.deleteButton;
			isSaved = false;
			panelEmbed.data.fields![0].value = "🔴";

			panelEmbed.data.fields![10].value = baseData.config.deleteButton ? "🟢" : "🔴";

			await originalResponse.edit({
				embeds: [panelEmbed],
				components,
			});
		}

		async function changeTicketButtonTranscriptPanel() {
			baseData.config.transcriptButton = !baseData.config.transcriptButton;
			isSaved = false;
			panelEmbed.data.fields![0].value = "🔴";

			panelEmbed.data.fields![11].value = baseData.config.transcriptButton ? "🟢" : "🔴";

			await originalResponse.edit({
				embeds: [panelEmbed],
				components,
			});
		}

		async function changeTicketChannelPanelOptions(i: StringSelectMenuInteraction<CacheType>) {
			// get the option with string select menu
			if (baseData.config.optionFields.length === 0) {
				return originalResponse.edit({
					content: lang.ticket_panel_change_embed_options_null,
					embeds: [panelEmbed],
					components
				});
			}

			const select = new StringSelectMenuBuilder()
				.setCustomId("change_channel_panel_id_for_option")
				.setPlaceholder(lang.ticket_panel_change_embed_options_chose)
				.addOptions(
					...baseData.config.optionFields.map((x, i) => {
						return new StringSelectMenuOptionBuilder()
							.setLabel(x.name)
							.setValue(i.toString())
					})
				);

			const select_interaction = await originalResponse.edit({
				components: [
					new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)
				],
				embeds: [],
				content: lang.ticket_panel_change_embed_options
			});

			// collector for string select
			const select_collector = select_interaction.createMessageComponentCollector({
				componentType: ComponentType.StringSelect,
				time: 60_000 * 5,
			});

			select_collector.on("collect", async (i) => {
				if (i.user.id !== interaction.member!.user.id) {
					return i.reply({ flags: [1 << 6], content: lang.help_not_for_you });
				};

				const choice = i.values[0];
				const option = baseData.config.optionFields[parseInt(choice)];

				const modal = await iHorizonModalResolve({
					customId: "change_panel_channel_id",
					deferUpdate: true,
					fields: [
						{
							customId: "embed_id",
							maxLength: 32,
							label: lang.ticket_panel_change_embed_modal_placeholder,
							required: true,
							style: TextInputStyle.Short,
							minLength: 8,
							placeHolder: lang.ticket_panel_channel_panel_embed_id
						}
					],
					title: lang.ticket_panel_change_embed_modal_placeholder

				}, i);

				let embed_id = modal?.fields.getTextInputValue("embed_id");

				// check if the embed exists
				const embed = await metasTable.get(`EMBED.${embed_id}`);

				if (!embed) {
					await originalResponse.edit({
						embeds: [panelEmbed], components, content: generateDetailedContent() || null,
					});
					select_collector.stop('legitEnd');
					return i.followUp({ flags: [1 << 6], content: lang.ticket_panel_change_embed_dont_exist });
				}

				option.panelId = embed_id;
				isSaved = false;
				panelEmbed.data.fields![0].value = "🔴";

				panelEmbed.data.fields![7].value = stringifyOptions(baseData.config.optionFields) || lang.var_no_set;

				await originalResponse.edit({
					embeds: [panelEmbed],
					components
				});

				select_collector.stop("legitEnd");
			});
		}

		async function changeRoleToPingOptions(i: StringSelectMenuInteraction<CacheType>) {
			// Vérifier qu'il y a des options disponibles
			if (baseData.config.optionFields.length === 0) {
				return originalResponse.edit({
					content: lang.ticket_panel_remove_option_empty,
					embeds: [panelEmbed],
					components,
				});
			}

			// Créer le menu de sélection pour choisir l'option
			const select = new StringSelectMenuBuilder()
				.setCustomId('select_option_role_ping')
				.setPlaceholder(lang.var_chose_option)
				.addOptions(baseData.config.optionFields.map((opt, idx) =>
					new StringSelectMenuOptionBuilder()
						.setLabel(opt.name)
						.setValue(idx.toString())
				));

			const msg = await originalResponse.edit({
				components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
				embeds: [],
				content: lang.ticket_panel_chose_option_to_form, // Peut être remplacé par une clé spécifique si disponible
			});

			const collector = msg.createMessageComponentCollector({
				componentType: ComponentType.StringSelect,
				time: 300_000
			});

			collector.on('collect', async (subI) => {
				if (subI.user.id !== interaction.member!.user.id) {
					return subI.reply({ flags: [1 << 6], content: lang.help_not_for_you });
				}

				const idx = parseInt(subI.values[0]);
				const option = baseData.config.optionFields[idx];

				if (isNaN(idx) || !baseData.config.optionFields[idx]) {
					await subI.reply({ content: lang.ticket_panel_option_invalid, flags: MessageFlags.Ephemeral });
					return;
				}

				// Initialiser le tableau rolesToPing si nécessaire
				if (!option.rolesToPing) {
					option.rolesToPing = [];
				}

				subI.deferUpdate();

				// Créer le sélecteur de rôles
				const roleSelect = new RoleSelectMenuBuilder()
					.setPlaceholder(lang.ticket_panel_change_role_roleSelect_placeholder)
					.setCustomId('change_role_option')
					.setMaxValues(10)
					.setMinValues(0);

				// Ajouter les rôles par défaut s'il y en a
				if (option.rolesToPing.length > 0) {
					roleSelect.addDefaultRoles(option.rolesToPing);
				}

				const roleMsg = await originalResponse.edit({
					components: [
						new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(roleSelect)
					],
					embeds: [],
					content: lang.ticket_panel_change_role_interaction_content.replace('${option.name}', option.name) ||
						`Sélectionnez les rôles à ping pour l'option: ${option.name}`
				});

				collector.stop('legitEnd');

				// Collector pour le sélecteur de rôles
				const roleCollector = roleMsg.createMessageComponentCollector({
					componentType: ComponentType.RoleSelect,
					time: 60_000,
				});

				roleCollector.on('collect', async (roleI) => {
					if (roleI.user.id !== interaction.member!.user.id) {
						return roleI.reply({ flags: [1 << 6], content: lang.help_not_for_you });
					}

					// Mettre à jour les rôles pour cette option
					option.rolesToPing = roleI.values;
					isSaved = false;
					panelEmbed.data.fields![0].value = '🔴';

					// Mettre à jour l'affichage des options
					panelEmbed.data.fields![7].value = stringifyOptions(baseData.config.optionFields) || lang.var_no_set;

					await roleI.deferUpdate();

					// Retourner à l'écran principal
					await originalResponse.edit({
						embeds: [panelEmbed],
						components,
						content: generateDetailedContent() || null
					});

					roleCollector.stop('legitEnd');
				});

				roleCollector.on('end', async (_, reason) => {
					if (reason === 'legitEnd') return;

					await roleMsg.edit({
						components,
						embeds: [panelEmbed],
						content: generateDetailedContent() || null
					});
				});
			});

			collector.on('end', async (_, reason) => {
				if (reason === 'legitEnd') return;

				await msg.edit({
					components,
					embeds: [panelEmbed],
					content: generateDetailedContent() || null
				});
			});
		}
	},
};