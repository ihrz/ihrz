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
	AttachmentBuilder,
	ButtonBuilder,
	ButtonStyle,
	CacheType,
	ChannelSelectMenuBuilder,
	ChannelType,
	ChatInputCommandInteraction,
	Client,
	ComponentType,
	ContainerBuilder,
	EmbedBuilder,
	Guild,
	Message,
	MessageFlags,
	RoleSelectMenuBuilder,
	SeparatorBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuInteraction,
	StringSelectMenuOptionBuilder,
	TextDisplayBuilder,
	TextInputStyle
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";

import { generatePassword } from "../../../core/functions/random.js";
import { iHorizonModalResolve } from "../../../core/functions/modalHelper.js";
import {
	isDiscordEmoji,
	isSingleEmoji
} from "../../../core/functions/emojiChecker.js";
import { metasTable } from "../../../Events/client/ready.js";
import { SubCommand } from "../../../../types/command.js";

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
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		// Guard checks
		if (
			!interaction.member ||
			!client.user ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		if (
			await client.db.get(`${interaction.guildId}.GUILD.TICKET.disable`)
		) {
			await client.func.method.interactionSend(interaction, {
				content: lang.open_disabled_command
			});
			return;
		}

		// Récupération de l'ID du panel
		const panel_id =
			interaction instanceof ChatInputCommandInteraction
				? interaction.options.getString("panel_id")
				: client.func.method.string(args!, 0);

		// Chargement ou creation du panel
		const rawData = await client.db.get(
			`${interaction.guildId}.GUILD.TICKET_PANEL.${panel_id}`
		);

		const baseData = {
			panelCode:
				rawData?.panelCode ||
				generatePassword({
					length: 10,
					uppercase: true,
					numbers: true
				}),
			relatedEmbedId: rawData?.relatedEmbedId ?? null,
			category: rawData?.category ?? null,
			placeholder:
				rawData?.placeholder || lang.ticket_panel_default_placeholder,
			config: {
				rolesToPing: rawData?.config?.rolesToPing || [],
				optionFields: rawData?.config?.optionFields || [],
				pingUser: rawData?.config?.pingUser ?? true,
				form: rawData?.config?.form || [],
				userSelectPanel: rawData?.config?.userSelectPanel ?? true,
				deleteButton: rawData?.config?.deleteButton ?? true,
				transcriptButton: rawData?.config?.transcriptButton ?? true
			},
			ticketChannelPanel: rawData?.ticketChannelPanel ?? undefined
		} as TicketPanel;

		const panelCode = baseData.panelCode;
		let isSaved = false;

		// Components V2 builders for the panel message
		const PANEL_ACCENT = 0x397c16;
		const V2_FLAGS: [MessageFlags.IsComponentsV2] = [
			MessageFlags.IsComponentsV2
		];

		function ticketEmoji(name: string): string | undefined {
			return (
				(
					client.iHorizon_Emojis as unknown as Record<
						string,
						string | undefined
					>
				)[name] || undefined
			);
		}

		function panelOption(
			label: string,
			value: string,
			emojiName?: string
		): StringSelectMenuOptionBuilder {
			const builder = new StringSelectMenuOptionBuilder()
				.setLabel(label)
				.setValue(value);
			const emoji = emojiName ? ticketEmoji(emojiName) : undefined;
			if (emoji) builder.setEmoji(emoji);
			return builder;
		}

		function buildContainer(): ContainerBuilder {
			const container = new ContainerBuilder().setAccentColor(
				PANEL_ACCENT
			);
			const headerEmoji = ticketEmoji("Ticket_Main");

			container.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`## ${headerEmoji ? `${headerEmoji} ` : ""}${lang.ticket_panel_embed_title}${panelCode}\n${lang.ticket_panel_embed_desc}`
				)
			);

			container.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`-# ${lang.ticket_panel_saved_conf}: ${isSaved ? "🟢" : "🔴"}\n` +
						`**${lang.ticket_panel_related_embed}**\n${baseData.relatedEmbedId || lang.var_no_set}\n` +
						`**${lang.ticket_panel_channel_panel_embed_id}**\n${baseData.ticketChannelPanel || lang.var_no_set}`
				)
			);

			container.addSeparatorComponents(new SeparatorBuilder());

			container.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`**${lang.ticket_panel_role_to_ping}**\n${formatRoles(baseData.config.rolesToPing, lang)}\n` +
						`**${lang.ticket_panel_ping_user}** ${baseData.config.pingUser ? "🟢" : "🔴"}\n` +
						`**${lang.ticket_panel_placeholder}**\n${baseData.placeholder || lang.var_no_set}\n` +
						`**${lang.ticket_panel_category}**\n${formatCategory(baseData.category, interaction.guild!)}\n` +
						`**${lang.ticket_panel_select_user}** ${baseData.config.userSelectPanel ? "🟢" : "🔴"}\n` +
						`**${lang.ticket_panel_button_delete}** ${baseData.config.deleteButton ? "🟢" : "🔴"}\n` +
						`**${lang.ticket_panel_button_transcript}** ${baseData.config.transcriptButton ? "🟢" : "🔴"}`
				)
			);

			container.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`### ${lang.ticket_panel_option_fields}\n${stringifyOptions(baseData.config.optionFields) || lang.var_no_set}`
				)
			);

			container.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`### ${lang.ticket_panel_form}\n${stringifyForm(baseData.config.form) || lang.var_no_set}`
				)
			);

			return container;
		}

		function buildPromptContainer(text: string): ContainerBuilder {
			return new ContainerBuilder()
				.setAccentColor(PANEL_ACCENT)
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(text)
				);
		}

		ensureUniqueOptionFieldValues();

		// Menu de sélection
		const panelSelect = new StringSelectMenuBuilder()
			.setCustomId("panelSelect")
			.setPlaceholder(lang.ticket_panel_panel_placeholder)
			.addOptions([
				panelOption(
					lang.ticket_panel_panel_1_label,
					"save",
					"Ticket_Save"
				),
				panelOption(
					lang.ticket_panel_panel_2_label,
					"preview",
					"Ticket_Preview"
				),
				panelOption(
					lang.ticket_panel_panel_3_label,
					"change_embed",
					"Ticket_Nitro"
				),
				panelOption(
					lang.ticket_panel_panel_4_label,
					"change_role",
					"Ticket_Role"
				),
				panelOption(
					lang.ticket_panel_panel_5_label,
					"change_placeholder",
					"Ticket_Paint"
				),
				panelOption(
					lang.ticket_panel_panel_6_label,
					"change_category",
					"Ticket_Category"
				),
				panelOption(
					lang.ticket_panel_panel_10_label,
					"change_category_2",
					"Ticket_Category"
				),
				panelOption(
					lang.ticket_panel_panel_7_label,
					"change_ping",
					"Ticket_Bell"
				),
				panelOption(
					lang.ticket_panel_panel_8_label,
					"change_option",
					"Ticket_List"
				),
				panelOption(
					lang.ticket_panel_panel_9_label,
					"change_form",
					"Ticket_Form"
				),
				panelOption(
					lang.ticket_panel_panel_11_label,
					"change_ticket_channel_panel",
					"Ticket_Hash"
				),
				panelOption(
					lang.ticket_panel_panel_12_label,
					"change_ticket_user_select_panel",
					"Ticket_User"
				),
				panelOption(
					lang.ticket_panel_panel_13_label,
					"change_ticket_button_delete_panel",
					"Ticket_Trash"
				),
				panelOption(
					lang.ticket_panel_panel_14_label,
					"change_ticket_button_transcript_panel",
					"Ticket_Transcript"
				),
				panelOption(
					lang.ticket_panel_panel_15_label,
					"change_ticket_channel_panel_options",
					"Ticket_Settings"
				),
				panelOption(
					lang.ticket_panel_panel_16_label,
					"change_ticket_forms_options",
					"Ticket_Form"
				),
				panelOption(
					lang.ticket_panel_panel_17_label,
					"change_role_to_ping_options",
					"Ticket_Megaphone"
				)
			]);

		const sendButton = new ButtonBuilder()
			.setCustomId("send_embed")
			.setLabel(lang.ticket_panel_button_send)
			.setStyle(ButtonStyle.Primary)
			.setEmoji(
				ticketEmoji("Ticket_Send") ?? client.iHorizon_Emojis.GreenTick
			);

		const components = [
			new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				panelSelect
			),
			new ActionRowBuilder<ButtonBuilder>().addComponents(sendButton)
		];

		const originalResponse = await client.func.method.interactionSend(
			interaction,
			buildPanelMessage()
		);

		if (interaction instanceof ChatInputCommandInteraction) {
			await interaction.followUp({
				content: "https://youtu.be/TehLPQ_WCwQ",
				flags: [1 << 6]
			});
		}

		const selectCollector =
			originalResponse.createMessageComponentCollector({
				componentType: ComponentType.StringSelect,
				time: 1_250_000 * 10
			});

		const buttonCollector =
			originalResponse.createMessageComponentCollector({
				componentType: ComponentType.Button,
				time: 1_250_000 * 10
			});

		buttonCollector.on("collect", async (i) => {
			if (i.user.id !== interaction.member!.user.id)
				return i.reply({
					flags: [1 << 6],
					content: lang.help_not_for_you
				});
			await i.deferUpdate();
			if (i.customId === "send_embed") await sendEmbed();
		});

		selectCollector.on(
			"collect",
			async (i: StringSelectMenuInteraction) => {
				if (i.user.id !== interaction.member!.user.id) {
					return i.reply({
						flags: [1 << 6],
						content: lang.help_not_for_you
					});
				}

				const choice = i.values[0];

				switch (choice) {
					case "save":
						await i.deferUpdate();
						await save();
						selectCollector.stop("legitEnd");
						break;
					case "preview":
						await preview(i);
						break;
					case "change_embed":
						await changeEmbed(i);
						break;
					case "change_role":
						await i.deferUpdate();
						await changeRole();
						break;
					case "change_ping":
						await i.deferUpdate();
						await changePing();
						break;
					case "change_option":
						await i.deferUpdate();
						await changeOption();
						break;
					case "change_category_2":
						await i.deferUpdate();
						await changeCategoryForOption();
						break;
					case "change_form":
						await i.deferUpdate();
						await changeForm();
						break;
					case "change_placeholder":
						await changePlaceholder(i);
						break;
					case "change_category":
						await i.deferUpdate();
						await changeCategory();
						break;
					case "change_ticket_channel_panel":
						await changeTicketChannelPanel(i);
						break;
					case "change_ticket_user_select_panel":
						await i.deferUpdate();
						await changeTicketUserSelectPanel();
						break;
					case "change_ticket_button_delete_panel":
						await i.deferUpdate();
						await changeTicketButtonDeletePanel();
						break;
					case "change_ticket_button_transcript_panel":
						await i.deferUpdate();
						await changeTicketButtonTranscriptPanel();
						break;
					case "change_ticket_channel_panel_options":
						await i.deferUpdate();
						await changeTicketChannelPanelOptions();
						break;
					case "change_ticket_forms_options":
						await i.deferUpdate();
						await changeTicketFormsOptions();
						break;
					case "change_role_to_ping_options":
						await i.deferUpdate();
						await changeRoleToPingOptions();
						break;
				}
			}
		);

		selectCollector.on("end", (_, reason) => {
			if (reason !== "legitEnd") {
				originalResponse.edit({
					components: [buildContainer()],
					flags: [MessageFlags.IsComponentsV2]
				});
			}
		});

		function formatRoles(roles: string[], lang: LanguageData) {
			return roles.length
				? roles.map((r) => `<@&${r}>`).join(" ")
				: lang.var_no_set;
		}

		function formatCategory(id: string | undefined, guild: Guild) {
			return id
				? guild.channels.cache.get(id)?.toString() || lang.var_no_set
				: lang.var_no_set;
		}

		function generateUniqueOptionFieldValue(usedValues: Set<string>) {
			return `ticket_option_${generatePassword({ length: 12, uppercase: true, numbers: true })}`;
		}

		function ensureUniqueOptionFieldValues() {
			const usedValues = new Set<string>();
			let hasChanged = false;

			for (const option of baseData.config.optionFields) {
				const currentValue =
					typeof option.value === "string" ? option.value.trim() : "";

				if (!currentValue || usedValues.has(currentValue)) {
					option.value = generateUniqueOptionFieldValue(usedValues);
					hasChanged = true;
				} else {
					option.value = currentValue;
				}

				usedValues.add(option.value);
			}

			return hasChanged;
		}

		function shouldAttachOptionsFile() {
			return (
				stringifyOptions(baseData.config.optionFields) ===
				lang.ticket_panel_option_fields
			);
		}

		function buildOptionsAttachment() {
			if (!shouldAttachOptionsFile()) return null;

			const details = stringifyOptionsDetailed(
				baseData.config.optionFields
			);
			return new AttachmentBuilder(Buffer.from(details, "utf-8"), {
				name: `ticket-panel-${panelCode}-options.txt`
			});
		}

		function buildPanelMessage() {
			const file = buildOptionsAttachment();
			return {
				components: [buildContainer(), ...components],
				files: file ? [file] : [],
				flags: V2_FLAGS
			};
		}

		async function refreshPanelMessage() {
			const panelMessage = buildPanelMessage();
			await originalResponse.edit({
				components: panelMessage.components,
				attachments: [],
				files: panelMessage.files,
				flags: [MessageFlags.IsComponentsV2]
			});
		}

		async function save() {
			ensureUniqueOptionFieldValues();
			await client.db.set(
				`${interaction.guildId}.GUILD.TICKET_PANEL.${panelCode}`,
				baseData
			);
			isSaved = true;
			const file = buildOptionsAttachment();
			await originalResponse.edit({
				components: [
					buildContainer(),
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setCustomId("saved")
							.setLabel("Saved")
							.setStyle(ButtonStyle.Success)
							.setEmoji(client.iHorizon_Emojis.Yes)
							.setDisabled(true)
					)
				],
				attachments: [],
				files: file ? [file] : [],
				flags: [MessageFlags.IsComponentsV2]
			});
		}

		function stringifyOptions(options: TicketOption[]): string {
			if (!options.length) return "";
			let str = "```\n";
			options.forEach((opt) => {
				str += `- ${opt.name}\n`;
				if (opt.desc)
					str += `  ┖ ${lang.ticket_panel_add_option_modal_field2_label}: ${opt.desc}\n`;
				if (opt.emoji)
					str += `  ┖ ${lang.ticket_panel_add_option_modal_field3_label}: ${opt.emoji}\n`;
				if (opt.categoryId)
					str += `  ┖ 📂: ${formatCategory(opt.categoryId, interaction.guild!)}\n`;
				if (opt.panelId)
					str += `  ┖ ${lang.ticket_panel_change_embed_modal_placeholder}: ${opt.panelId}\n`;
				if (opt.rolesToPing?.length >= 1) {
					str += `  ┖ ${lang.ticket_panel_role_to_ping}:\n`;
					for (const role of opt.rolesToPing) {
						const r = interaction.guild?.roles.cache.get(role);
						str += `     ┖ 🔹 ${role} (@${r?.name || lang.var_unknown})\n`;
					}
					str += "\n";
				}

				if (opt.form?.length) {
					str += `  ┖ 📚 ${lang.var_form}:\n`;
					opt.form.forEach((f) => {
						str += `     ┖ 🔹 ${f.questionTitle}\n`;
						if (f.questionPlaceholder)
							str += `       ┖ ${f.questionPlaceholder}\n`;
					});
				}
				str += "\n";
			});
			str += "```";

			// Check if the string exceeds Discord's field limit (1024 characters)
			if (str.length > 1024) {
				return lang.ticket_panel_option_fields;
			}

			return str;
		}

		// Also replace the stringifyForm function
		function stringifyForm(forms: TicketForms[]): string {
			if (!forms.length) return "";
			let str = "```\n";
			forms.forEach((f, i) => {
				str += `${i} - ${f.questionTitle}\n`;
				if (f.questionPlaceholder)
					str += `  ┖ ${f.questionPlaceholder}\n`;
				str += "\n";
			});
			str += "```";

			// Check if the string exceeds Discord's field limit
			if (str.length > 1024) {
				return lang.ticket_panel_option_fields;
			}

			return str;
		}

		function stringifyOptionsDetailed(options: TicketOption[]): string {
			if (!options.length) return lang.var_no_set;
			let str = "";
			options.forEach((opt) => {
				str += `- ${opt.name}\n`;
				if (opt.desc)
					str += `  ${lang.ticket_panel_add_option_modal_field2_label}: ${opt.desc}\n`;
				if (opt.emoji)
					str += `  ${lang.ticket_panel_add_option_modal_field3_label}: ${opt.emoji}\n`;
				if (opt.categoryId)
					str += `  Category: ${formatCategory(opt.categoryId, interaction.guild!)}\n`;
				if (opt.panelId)
					str += `  ${lang.ticket_panel_change_embed_modal_placeholder}: ${opt.panelId}\n`;
				if (opt.rolesToPing?.length >= 1) {
					str += `  ${lang.ticket_panel_role_to_ping}:\n`;
					for (const role of opt.rolesToPing) {
						const r = interaction.guild?.roles.cache.get(role);
						str += `    - ${role} (@${r?.name || lang.var_unknown})\n`;
					}
				}
				if (opt.form?.length) {
					str += `  ${lang.var_form}:\n`;
					opt.form.forEach((f) => {
						str += `    - ${f.questionTitle}\n`;
						if (f.questionPlaceholder)
							str += `      ${f.questionPlaceholder}\n`;
					});
				}
				str += "\n";
			});
			return str.trimEnd();
		}

		async function sendEmbed() {
			if (baseData.config.optionFields.length === 0)
				return originalResponse.edit({
					components: [
						buildPromptContainer(lang.ticket_panel_need_1_option),
						...components
					],
					flags: [MessageFlags.IsComponentsV2]
				});

			ensureUniqueOptionFieldValues();
			await client.db.set(
				`${interaction.guildId}.GUILD.TICKET_PANEL.${panelCode}`,
				baseData
			);
			isSaved = true;

			const channelSelect = new ChannelSelectMenuBuilder()
				.setCustomId("send_embed")
				.setPlaceholder(lang.ticket_panel_select_channel_to_send)
				.setChannelTypes(ChannelType.GuildText);

			const msg = await originalResponse.edit({
				components: [
					buildPromptContainer(
						lang.ticket_panel_select_channel_to_send
					),
					new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
						channelSelect
					)
				],
				files: [],
				flags: [MessageFlags.IsComponentsV2]
			});

			const collector = msg.createMessageComponentCollector({
				componentType: ComponentType.ChannelSelect,
				time: 60_000
			});
			collector.on("collect", async (i) => {
				if (i.user.id !== interaction.member!.user.id)
					return i.reply({
						flags: [1 << 6],
						content: lang.help_not_for_you
					});
				const channel = await i.guild?.channels.fetch(i.values[0]);
				if (!channel?.isSendable())
					return i.reply({
						flags: [1 << 6],
						content: lang.ticket_panel_channel_error
					});

				const embedData = await metasTable.get(
					`EMBED.${baseData.relatedEmbedId}`
				);
				if (!embedData?.embedSource)
					return i.reply({
						flags: [1 << 6],
						content: lang.ticket_panel_related_embed_dont_exist
					});

				const embed = EmbedBuilder.from(embedData.embedSource);
				const selectMenu = new StringSelectMenuBuilder()
					.setCustomId("ticket-open-selection-v2")
					.setPlaceholder(baseData.placeholder)
					.addOptions(
						baseData.config.optionFields.map((opt) => {
							const builder = new StringSelectMenuOptionBuilder()
								.setLabel(opt.name.substring(0, 100))
								.setValue(opt.value);
							if (opt.desc)
								builder.setDescription(
									opt.desc.substring(0, 100)
								);
							if (opt.emoji) builder.setEmoji(opt.emoji);
							return builder;
						})
					);

				const sentPanel = await channel.send({
					embeds: [embed],
					components: [
						new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
							selectMenu
						)
					]
				});
				await client.db.set(
					`${interaction.guildId}.GUILD.TICKET_PANEL.${sentPanel.id}`,
					panelCode
				);

				collector.stop("legitEnd");
				selectCollector.stop("legitEnd");
				await originalResponse.edit({
					components: [
						buildPromptContainer(
							lang.ticket_panel_saved_and_sended_panel
								.replace("${panelCode}", panelCode)
								.replace(
									"${channel.toString()}",
									channel.toString()
								)
						)
					],
					files: [],
					flags: [MessageFlags.IsComponentsV2]
				});
			});
		}

		async function selectOption(optionCustomId: string, content: string) {
			if (baseData.config.optionFields.length === 0) {
				const file = buildOptionsAttachment();
				await originalResponse.edit({
					components: [
						buildPromptContainer(
							lang.ticket_panel_remove_option_empty
						),
						...components
					],
					attachments: [],
					files: file ? [file] : [],
					flags: [MessageFlags.IsComponentsV2]
				});
				return null;
			}

			const select = new StringSelectMenuBuilder()
				.setCustomId(optionCustomId)
				.setPlaceholder(lang.var_chose_option)
				.addOptions(
					baseData.config.optionFields.map((opt, idx) =>
						new StringSelectMenuOptionBuilder()
							.setLabel(opt.name.substring(0, 100))
							.setValue(idx.toString())
					)
				);

			const msg = await originalResponse.edit({
				components: [
					buildPromptContainer(content),
					new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
						select
					)
				],
				files: [],
				flags: [MessageFlags.IsComponentsV2]
			});

			return await new Promise<{
				option: TicketOption;
				index: number;
				interaction: StringSelectMenuInteraction<CacheType>;
			} | null>((resolve) => {
				const collector = msg.createMessageComponentCollector({
					componentType: ComponentType.StringSelect,
					time: 300_000,
					max: 1
				});

				collector.on("collect", async (subI) => {
					if (subI.user.id !== interaction.member!.user.id) {
						await subI.reply({
							flags: [1 << 6],
							content: lang.help_not_for_you
						});
						return;
					}

					const idx = parseInt(subI.values[0]);
					const option = baseData.config.optionFields[idx];
					if (isNaN(idx) || !option) {
						await subI.reply({
							content: lang.ticket_panel_option_invalid,
							flags: MessageFlags.Ephemeral
						});
						return;
					}

					resolve({ option, index: idx, interaction: subI });
					collector.stop("legitEnd");
				});

				collector.on("end", async (_, reason) => {
					if (reason === "legitEnd") return;
					await refreshPanelMessage();
					resolve(null);
				});
			});
		}

		async function changeTicketFormsOptions() {
			const selected = await selectOption(
				"select_option_form",
				lang.ticket_panel_chose_option_to_form
			);
			if (!selected) return;

			const { option } = selected;
			await selected.interaction.deferUpdate();
			const actionSelect = new StringSelectMenuBuilder()
				.setCustomId("form_action")
				.setPlaceholder(lang.var_action)
				.addOptions(
					new StringSelectMenuOptionBuilder()
						.setLabel(lang.ticket_panel_add_a_question)
						.setValue("add"),
					new StringSelectMenuOptionBuilder()
						.setLabel(lang.ticket_panel_remove_a_question)
						.setValue("remove")
				);

			await originalResponse.edit({
				components: [
					buildPromptContainer(
						lang.ticket_panel_manage_form_title.replace(
							"${option.name}",
							option.name
						)
					),
					new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
						actionSelect
					)
				],
				files: [],
				flags: [MessageFlags.IsComponentsV2]
			});

			const actionCollector =
				originalResponse.createMessageComponentCollector({
					componentType: ComponentType.StringSelect,
					time: 60_000 * 15,
					max: 1
				});
			actionCollector.on("collect", async (actionI) => {
				if (actionI.user.id !== interaction.member!.user.id) {
					return actionI.reply({
						flags: [1 << 6],
						content: lang.help_not_for_you
					});
				}

				if (actionI.values[0] === "add") {
					if (!option.form) option.form = [];

					if (option.form.length >= 3) {
						return actionI.reply({
							content: lang.ticket_panel_add_form_max_3,
							flags: MessageFlags.Ephemeral
						});
					}

					const modal = await iHorizonModalResolve(
						{
							customId: "add_form_opt",
							title: lang.ticket_panel_add_a_question,
							fields: [
								{
									customId: "title",
									label: lang.var_title,
									style: TextInputStyle.Short,
									required: true,
									maxLength: 128
								},
								{
									customId: "placeholder",
									label: lang.roleselect_modal2_label,
									style: TextInputStyle.Short,
									required: false,
									maxLength: 100
								}
							],
							deferUpdate: true
						},
						actionI
					);

					if (!modal) return;

					const title = modal.fields.getTextInputValue("title");
					const placeholder =
						modal.fields.getTextInputValue("placeholder");

					option.form.push({
						questionId: option.form.length,
						questionTitle: title,
						questionPlaceholder: placeholder
					});

					isSaved = false;
					await refreshPanelMessage();
				} else if (actionI.values[0] === "remove") {
					if (!option.form || option.form.length === 0) {
						await refreshPanelMessage();
						return actionI.reply({
							content: lang.ticket_panel_no_question_to_delete,
							flags: MessageFlags.Ephemeral
						});
					}

					const formSelect = new StringSelectMenuBuilder()
						.setCustomId("remove_form_opt")
						.setPlaceholder(lang.ticket_panel_chose_a_question)
						.addOptions(
							option.form.map((f, i) =>
								new StringSelectMenuOptionBuilder()
									.setLabel(f.questionTitle.substring(0, 100))
									.setValue(i.toString())
							)
						);

					await actionI.deferUpdate();

					await originalResponse.edit({
						components: [
							buildPromptContainer(
								lang.ticket_panel_select_question_to_delete
							),
							new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
								formSelect
							)
						],
						files: [],
						flags: [MessageFlags.IsComponentsV2]
					});

					const removeCollector =
						originalResponse.createMessageComponentCollector({
							componentType: ComponentType.StringSelect,
							time: 60_000 * 5,
							max: 1
						});
					removeCollector.on("collect", async (rmI) => {
						if (rmI.user.id !== interaction.member!.user.id)
							return rmI.reply({
								flags: [1 << 6],
								content: lang.help_not_for_you
							});
						await rmI.deferUpdate();
						const fid = parseInt(rmI.values[0]);
						option.form!.splice(fid, 1);
						isSaved = false;
						await refreshPanelMessage();
						removeCollector.stop("legitEnd");
					});
				}
				actionCollector.stop("legitEnd");
			});

			actionCollector.on("end", async (_, reason) => {
				if (reason === "legitEnd") return;
				await refreshPanelMessage();
			});
		}

		async function changeCategoryForOption() {
			const selected = await selectOption(
				"change_category_for_option",
				lang.ticket_panel_option_change_category
			);
			if (!selected) return;

			const { option } = selected;
			await selected.interaction.deferUpdate();
			const channelSelect = new ChannelSelectMenuBuilder()
				.setCustomId("change_category_for_option_channel")
				.setChannelTypes(ChannelType.GuildCategory)
				.setPlaceholder(
					lang.ticket_panel_change_category_channelSelect_placeholder
				);

			const sendEmbedInteraction = await originalResponse.edit({
				components: [
					buildPromptContainer(
						lang.ticket_panel_change_category_channelSelect_placeholder
					),
					new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
						channelSelect
					)
				],
				files: [],
				flags: [MessageFlags.IsComponentsV2]
			});

			const channelCollector =
				sendEmbedInteraction.createMessageComponentCollector({
					componentType: ComponentType.ChannelSelect,
					time: 60_000,
					max: 1
				});

			channelCollector.on("collect", async (i) => {
				if (i.user.id !== interaction.member!.user.id) {
					return i.reply({
						flags: [1 << 6],
						content: lang.help_not_for_you
					});
				}

				const category = i.values[0];
				await i.deferUpdate();

				option.categoryId = category;
				isSaved = false;

				await refreshPanelMessage();
				channelCollector.stop("legitEnd");
			});

			channelCollector.on("end", async (_, reason) => {
				if (reason === "legitEnd") return;
				await refreshPanelMessage();
			});
		}

		async function changeCategory() {
			const channelSelect = new ChannelSelectMenuBuilder()
				.setCustomId("change_category")
				.setChannelTypes(ChannelType.GuildCategory)
				.setPlaceholder(
					lang.ticket_panel_change_category_channelSelect_placeholder
				);

			const sendEmbedInteraction = await originalResponse.edit({
				components: [
					buildPromptContainer(
						lang.ticket_panel_select_channel_to_send
					),
					new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
						channelSelect
					)
				],
				files: [],
				flags: [MessageFlags.IsComponentsV2]
			});

			const channelCollector =
				sendEmbedInteraction.createMessageComponentCollector({
					componentType: ComponentType.ChannelSelect,
					time: 60_000
				});

			channelCollector.on("collect", async (i) => {
				if (i.user.id !== interaction.member!.user.id) {
					return i.reply({
						flags: [1 << 6],
						content: lang.help_not_for_you
					});
				}

				const category = i.values[0];
				await i.deferUpdate();

				const fetchChannel = await i.guild?.channels.fetch(category)!;

				baseData.category = category;
				isSaved = false;

				await refreshPanelMessage();
				channelCollector.stop("legitEnd");
			});

			channelCollector.on("end", async (_, reason) => {
				if (reason === "legitEnd") return;
				await refreshPanelMessage();
			});
		}

		async function changePlaceholder(
			i: StringSelectMenuInteraction<CacheType>
		) {
			const modal = await iHorizonModalResolve(
				{
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
				},
				i
			);

			if (!modal) return;

			const placeholder = modal.fields.getTextInputValue("placeholder");

			baseData.placeholder = placeholder;
			isSaved = false;

			await modal.deferUpdate();
			await refreshPanelMessage();
		}

		async function changeRole() {
			const roleSelect = new RoleSelectMenuBuilder()
				.setPlaceholder(
					lang.ticket_panel_change_role_roleSelect_placeholder
				)
				.setCustomId("change_role")
				.setMaxValues(10)
				.setMinValues(0)
				.addDefaultRoles(baseData.config.rolesToPing || []);

			const changeRoleInteraction = await originalResponse.edit({
				components: [
					buildPromptContainer(
						lang.ticket_panel_change_role_interaction_content
					),
					new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
						roleSelect
					)
				],
				files: [],
				flags: [MessageFlags.IsComponentsV2]
			});

			const roleCollector =
				changeRoleInteraction.createMessageComponentCollector({
					componentType: ComponentType.RoleSelect,
					time: 60_000
				});

			roleCollector.on("collect", async (i) => {
				if (i.user.id !== interaction.member!.user.id) {
					return i.reply({
						flags: [1 << 6],
						content: lang.help_not_for_you
					});
				}

				baseData.config.rolesToPing = i.values;
				isSaved = false;

				await i.deferUpdate();
				await refreshPanelMessage();
				roleCollector.stop("legitEnd");
			});

			roleCollector.on("end", async (_, reason) => {
				if (reason === "legitEnd") return;
				await refreshPanelMessage();
			});
		}

		async function changePing() {
			baseData.config.pingUser = !baseData.config.pingUser;
			isSaved = false;
			await refreshPanelMessage();
		}

		async function changeEmbed(i: StringSelectMenuInteraction<CacheType>) {
			const modal = await iHorizonModalResolve(
				{
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
				},
				i
			);

			if (!modal) return;

			const embedId = modal.fields.getTextInputValue("embed_id");
			const embed = await metasTable.get(`EMBED.${embedId}`);

			if (!embed) {
				return modal.reply({
					flags: [1 << 6],
					content: lang.ticket_panel_change_embed_dont_exist
				});
			}

			baseData.relatedEmbedId = embedId;
			isSaved = false;
			await modal.deferUpdate();
			await refreshPanelMessage();
		}

		async function changeTicketChannelPanel(
			i: StringSelectMenuInteraction<CacheType>
		) {
			const modal = await iHorizonModalResolve(
				{
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
				},
				i
			);

			if (!modal) return;

			await i.followUp({
				content: lang.ticket_panel_tip_about_variable1.replace(
					"${client.iHorizon_Emojis.VC_OpenChat}",
					client.iHorizon_Emojis.VC_OpenChat
				),
				flags: MessageFlags.Ephemeral
			});

			let embedId: string | undefined =
				modal.fields.getTextInputValue("embed_id");
			const embed = await metasTable.get(`EMBED.${embedId}`);

			if (!embed) {
				await modal.reply({
					flags: [1 << 6],
					content: lang.ticket_panel_change_embed_dont_exist
				});
				embedId = undefined;
			}

			baseData.ticketChannelPanel = embedId;
			isSaved = false;
			await modal.deferUpdate();
			await refreshPanelMessage();
		}

		async function changeOption() {
			const select = new StringSelectMenuBuilder()
				.setCustomId("change_option")
				.setPlaceholder(
					lang.ticket_panel_change_option_select_placeholder
				)
				.addOptions(
					new StringSelectMenuOptionBuilder()
						.setLabel(
							lang.ticket_panel_change_option_select_1_label
						)
						.setValue("add"),
					new StringSelectMenuOptionBuilder()
						.setLabel(
							lang.ticket_panel_change_option_select_2_label
						)
						.setValue("remove")
				);

			const selectInteraction = await originalResponse.edit({
				components: [
					buildPromptContainer(
						lang.ticket_panel_change_option_interaction_content
					),
					new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
						select
					)
				],
				files: [],
				flags: [MessageFlags.IsComponentsV2]
			});

			const selectCollector =
				selectInteraction.createMessageComponentCollector({
					componentType: ComponentType.StringSelect,
					time: 60_000,
					max: 1
				});

			selectCollector.on("collect", async (i) => {
				if (i.user.id !== interaction.member!.user.id) {
					return i.reply({
						flags: [1 << 6],
						content: lang.help_not_for_you
					});
				}

				const choice = i.values[0];

				switch (choice) {
					case "add":
						await addOption(i);
						selectCollector.stop("legitEnd");
						break;
					case "remove":
						await i.deferUpdate();
						await removeOption();
						selectCollector.stop("legitEnd");
						break;
				}
			});

			selectCollector.on("end", async (_, reason) => {
				if (reason === "legitEnd") return;
				await refreshPanelMessage();
			});
		}

		async function addOption(i: StringSelectMenuInteraction<CacheType>) {
			if (baseData.config.optionFields.length >= 10) {
				await refreshPanelMessage();
				return i.reply({
					flags: [1 << 6],
					content: lang.ticket_panel_add_option_max_10
				});
			}

			const modal = await iHorizonModalResolve(
				{
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
				},
				i
			);

			if (!modal) return;

			const name = modal.fields.getTextInputValue("name");
			const desc = modal.fields.getTextInputValue("desc");
			let emoji: string | undefined =
				modal.fields.getTextInputValue("emoji");

			if (!isSingleEmoji(emoji) && !isDiscordEmoji(emoji)) {
				emoji = undefined;
			}

			baseData.config.optionFields.push({
				name,
				desc,
				emoji,
				value: generateUniqueOptionFieldValue(
					new Set(
						baseData.config.optionFields.map(
							(option) => option.value
						)
					)
				),
				rolesToPing: []
			});

			isSaved = false;

			await modal.deferUpdate();
			await refreshPanelMessage();
		}

		async function removeOption() {
			const selected = await selectOption(
				"remove_option",
				lang.ticket_panel_rempve_option_interaction_content
			);
			if (!selected) return;

			await selected.interaction.deferUpdate();
			baseData.config.optionFields.splice(selected.index, 1);
			isSaved = false;
			await refreshPanelMessage();
		}

		async function changeForm() {
			const select = new StringSelectMenuBuilder()
				.setCustomId("change_form")
				.setPlaceholder(
					lang.ticket_panel_change_option_select_placeholder
				)
				.addOptions(
					new StringSelectMenuOptionBuilder()
						.setLabel(
							lang.ticket_panel_change_form_select_placeholder_1
						)
						.setValue("add"),
					new StringSelectMenuOptionBuilder()
						.setLabel(
							lang.ticket_panel_change_form_select_placeholder_2
						)
						.setValue("remove")
				);

			const selectInteraction = await originalResponse.edit({
				components: [
					buildPromptContainer(
						lang.ticket_panel_change_form_interaction_content
					),
					new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
						select
					)
				],
				files: [],
				flags: [MessageFlags.IsComponentsV2]
			});

			const selectCollector =
				selectInteraction.createMessageComponentCollector({
					componentType: ComponentType.StringSelect,
					time: 60_000,
					max: 1
				});

			selectCollector.on("collect", async (i) => {
				if (i.user.id !== interaction.member!.user.id) {
					return i.reply({
						flags: [1 << 6],
						content: lang.help_not_for_you
					});
				}

				const choice = i.values[0];

				switch (choice) {
					case "add":
						await addForm(i);
						selectCollector.stop("legitEnd");
						break;
					case "remove":
						await i.deferUpdate();
						await removeForm();
						selectCollector.stop("legitEnd");
						break;
				}
			});

			selectCollector.on("end", async (_, reason) => {
				if (reason === "legitEnd") return;
				await refreshPanelMessage();
			});
		}

		async function addForm(i: StringSelectMenuInteraction<CacheType>) {
			if (baseData.config.form.length >= 3) {
				await refreshPanelMessage();
				return i.reply({
					flags: [1 << 6],
					content: lang.ticket_panel_add_form_max_3
				});
			}

			const modal = await iHorizonModalResolve(
				{
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
				},
				i
			);

			if (!modal) return;

			const questionTitle =
				modal.fields.getTextInputValue("questionTitle");
			const questionPlaceholder = modal.fields.getTextInputValue(
				"questionPlaceholder"
			);

			baseData.config.form.push({
				questionId: baseData.config.form.length,
				questionTitle,
				questionPlaceholder
			});

			isSaved = false;

			await modal.deferUpdate();
			await refreshPanelMessage();
		}

		async function removeForm() {
			if (baseData.config.form.length === 0) {
				const file = buildOptionsAttachment();
				await refreshPanelMessage();
				return originalResponse.edit({
					components: [
						buildPromptContainer(
							lang.ticket_panel_remove_option_empty
						),
						...components
					],
					attachments: [],
					files: file ? [file] : [],
					flags: [MessageFlags.IsComponentsV2]
				});
			}

			const select = new StringSelectMenuBuilder()
				.setCustomId("remove_form")
				.setPlaceholder(
					lang.ticket_panel_remove_option_select_placeholder
				)
				.addOptions(
					...baseData.config.form.map((x, i) => {
						return new StringSelectMenuOptionBuilder()
							.setLabel(x.questionTitle.substring(0, 100))
							.setValue(i.toString());
					})
				);

			const selectInteraction = await originalResponse.edit({
				components: [
					buildPromptContainer(
						lang.ticket_panel_rempve_option_interaction_content
					),
					new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
						select
					)
				],
				files: [],
				flags: [MessageFlags.IsComponentsV2]
			});

			const selectCollector =
				selectInteraction.createMessageComponentCollector({
					componentType: ComponentType.StringSelect,
					time: 60_000,
					max: 1
				});

			selectCollector.on("collect", async (i) => {
				if (i.user.id !== interaction.member!.user.id) {
					return i.reply({
						flags: [1 << 6],
						content: lang.help_not_for_you
					});
				}

				const choice = i.values[0];
				baseData.config.form.splice(parseInt(choice), 1);

				isSaved = false;

				await i.deferUpdate();
				await refreshPanelMessage();
				selectCollector.stop("legitEnd");
			});

			selectCollector.on("end", async (_, reason) => {
				if (reason === "legitEnd") return;
				await refreshPanelMessage();
			});
		}

		async function preview(i: StringSelectMenuInteraction<CacheType>) {
			const relatedEmbed = await metasTable.get(
				`EMBED.${baseData.relatedEmbedId}`
			);

			if (!relatedEmbed || !relatedEmbed.embedSource) {
				await refreshPanelMessage();
				return i.reply({
					flags: [1 << 6],
					content: lang.ticket_panel_related_embed_dont_exist
				});
			}

			if (baseData.config.optionFields.length === 0) {
				return i.reply({
					flags: [1 << 6],
					content: lang.ticket_panel_need_1_option
				});
			}

			const embed = EmbedBuilder.from(relatedEmbed.embedSource);
			ensureUniqueOptionFieldValues();

			const selectMenu = new StringSelectMenuBuilder()
				.setCustomId("ticket-open-selection-v2-preview")
				.setPlaceholder(baseData.placeholder)
				.addOptions(
					baseData.config.optionFields.map((x) => {
						const optionBuilder =
							new StringSelectMenuOptionBuilder()
								.setLabel(x.name.substring(0, 100))
								.setValue(x.value);

						if (x.desc) {
							optionBuilder.setDescription(
								x.desc.substring(0, 100)
							);
						}

						if (x.emoji) {
							optionBuilder.setEmoji(x.emoji);
						}

						return optionBuilder;
					})
				);

			await i.reply({
				embeds: [embed],
				content: lang.ticket_panel_preview_message,
				components: [
					new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
						selectMenu
					)
				],
				flags: [1 << 6]
			});
		}

		async function changeTicketUserSelectPanel() {
			baseData.config.userSelectPanel = !baseData.config.userSelectPanel;
			isSaved = false;
			await refreshPanelMessage();
		}

		async function changeTicketButtonDeletePanel() {
			baseData.config.deleteButton = !baseData.config.deleteButton;
			isSaved = false;
			await refreshPanelMessage();
		}

		async function changeTicketButtonTranscriptPanel() {
			baseData.config.transcriptButton =
				!baseData.config.transcriptButton;
			isSaved = false;
			await refreshPanelMessage();
		}

		async function changeTicketChannelPanelOptions() {
			const selected = await selectOption(
				"change_channel_panel_id_for_option",
				lang.ticket_panel_change_embed_options
			);
			if (!selected) return;

			const { option, interaction: optionInteraction } = selected;
			const modal = await iHorizonModalResolve(
				{
					customId: "change_panel_channel_id",
					deferUpdate: false,
					fields: [
						{
							customId: "embed_id",
							maxLength: 32,
							label: lang.ticket_panel_change_embed_modal_placeholder,
							required: true,
							style: TextInputStyle.Short,
							minLength: 8,
							placeHolder:
								lang.ticket_panel_channel_panel_embed_id
						}
					],
					title: lang.ticket_panel_change_embed_modal_placeholder
				},
				optionInteraction
			);

			if (!modal) {
				await refreshPanelMessage();
				return;
			}

			const embedId = modal.fields.getTextInputValue("embed_id");
			const embed = await metasTable.get(`EMBED.${embedId}`);

			if (!embed) {
				await refreshPanelMessage();
				return modal.reply({
					flags: [1 << 6],
					content: lang.ticket_panel_change_embed_dont_exist
				});
			}

			option.panelId = embedId;
			isSaved = false;
			await modal.deferUpdate();
			await refreshPanelMessage();
		}

		async function changeRoleToPingOptions() {
			const selected = await selectOption(
				"select_option_role_ping",
				lang.ticket_panel_chose_option_to_form
			);
			if (!selected) return;

			const { option } = selected;
			await selected.interaction.deferUpdate();
			if (!option.rolesToPing) {
				option.rolesToPing = [];
			}

			const roleSelect = new RoleSelectMenuBuilder()
				.setPlaceholder(
					lang.ticket_panel_change_role_roleSelect_placeholder
				)
				.setCustomId("change_role_option")
				.setMaxValues(10)
				.setMinValues(0);

			if (option.rolesToPing.length > 0) {
				roleSelect.addDefaultRoles(option.rolesToPing);
			}

			const roleMsg = await originalResponse.edit({
				components: [
					buildPromptContainer(
						lang.ticket_panel_change_role_interaction_content.replace(
							"${option.name}",
							option.name
						)
					),
					new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
						roleSelect
					)
				],
				files: [],
				flags: [MessageFlags.IsComponentsV2]
			});

			const roleCollector = roleMsg.createMessageComponentCollector({
				componentType: ComponentType.RoleSelect,
				time: 60_000,
				max: 1
			});

			roleCollector.on("collect", async (roleI) => {
				if (roleI.user.id !== interaction.member!.user.id) {
					return roleI.reply({
						flags: [1 << 6],
						content: lang.help_not_for_you
					});
				}

				option.rolesToPing = roleI.values;
				isSaved = false;

				await roleI.deferUpdate();
				await refreshPanelMessage();
				roleCollector.stop("legitEnd");
			});

			roleCollector.on("end", async (_, reason) => {
				if (reason === "legitEnd") return;
				await refreshPanelMessage();
			});
		}
	}
};
