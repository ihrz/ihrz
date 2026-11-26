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
	ButtonInteraction,
	ButtonStyle,
	ChannelSelectMenuBuilder,
	ChannelSelectMenuInteraction,
	ChannelType,
	ChatInputCommandInteraction,
	Client,
	ContainerBuilder,
	LabelBuilder,
	Message,
	MessageComponentInteraction,
	MessageFlags,
	ModalBuilder,
	ModalSubmitInteraction,
	PermissionFlagsBits,
	SeparatorBuilder,
	SeparatorSpacingSize,
	StringSelectMenuBuilder,
	StringSelectMenuInteraction,
	TextDisplayBuilder,
	TextInputBuilder,
	TextInputStyle,
	escapeMarkdown
} from "discord.js";
import { LanguageData } from "../../../../types/languageData.js";
import { DatabaseStructure } from "../../../../types/database_structure.js";

import { SubCommand } from "../../../../types/command.js";
import logger from "../../../core/logger.js";
import { metasTable } from "../../../Events/client/ready.js";
import { readSavedEmbed } from "../../../core/functions/embedHelper.js";
import {
	CONFESSION_BUTTON_STYLES,
	CONFESSION_EMOJI_MAX,
	CONFESSION_LABEL_MAX,
	ConfessionButtonStyle,
	botCanUseEmoji,
	deleteConfessionPanelMessage,
	emojiText,
	isValidButtonEmoji,
	normalizeConfessionButton,
	parseCustomEmoji,
	refreshConfessionPanel,
	sendConfessionPanel
} from "../../../core/modules/confessionManager.js";
import {
	ACCENT,
	botSignature,
	fieldLines
} from "../../../core/modules/uiCard.js";

// How long the card answers, and how long a modal may stay open.
const COLLECTOR_MS = 10 * 60 * 1000;
const MODAL_MS = 5 * 60 * 1000;
const ACCENT_OFF = 0x4f545c;
const DEFAULT_COOLDOWN = "5min";

const ID = {
	channel: "confess-panel-channel",
	toggle: "confess-panel-toggle",
	threads: "confess-panel-threads",
	cooldown: "confess-panel-cooldown",
	style: "confess-panel-style",
	button: "confess-panel-button",
	reset: "confess-panel-reset",
	embed: "confess-panel-embed",
	fieldCooldown: "confess-panel-field-cooldown",
	fieldLabel: "confess-panel-field-label",
	fieldEmoji: "confess-panel-field-emoji",
	fieldEmbed: "confess-panel-field-embed"
} as const;

const STYLE_SWATCH: Record<ConfessionButtonStyle, string> = {
	primary: "🟦",
	secondary: "⬜",
	success: "🟩",
	danger: "🟥"
};

type Config = DatabaseStructure.ConfessionSchema;
type Clicked =
	| ButtonInteraction
	| ChannelSelectMenuInteraction
	| StringSelectMenuInteraction;

// /confession panel: every setting of the confession module on one card —
// the panel's channel, on/off, threads, cooldown, and the panel's look (the
// button's text, emoji and colour, an embed saved with /embed).
export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData
	) => {
		// Guard's Typing
		if (
			!interaction.member ||
			!client.user ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const guild = interaction.guild;
		const emojis = client.iHorizon_Emojis;
		const path = `${guild.id}.GUILD.CONFESSION`;
		const authorId = client.func.method.authorOf(interaction).id;
		const signature = await botSignature(client, guild.id);
		const no = (text: string) => `${emojis.No} ${text}`;
		const yes = (text: string) => `${emojis.Yes} ${text}`;
		const styleName = (style: ConfessionButtonStyle) =>
			lang[`confession_panel_style_${style}`];

		const load = async (): Promise<Config> =>
			((await client.db.get(path)) ?? {}) as Config;

		let flash: string | null = null;

		const embedLine = async (config: Config): Promise<string> => {
			if (!config.embedId) return lang.confession_panel_embed_default;
			const code = config.embedId.replace(/`/g, "");
			const saved = await readSavedEmbed(config.embedId, (key) =>
				metasTable.get(key)
			).catch(() => null);
			return saved
				? `\`${code}\``
				: lang.confession_panel_embed_missing.replace("${code}", code);
		};

		const build = async (
			config: Config,
			ended = false
		): Promise<ContainerBuilder> => {
			const enabled = !config.disable;
			const threads = config.thread === "yes";
			const look = normalizeConfessionButton(
				config.button,
				lang.confession_panel_button_default_label,
				(id) => botCanUseEmoji(client, guild, id)
			);
			const preview = `${STYLE_SWATCH[look.style]} **[ ${[
				emojiText(look.emoji),
				escapeMarkdown(look.label)
			]
				.filter(Boolean)
				.join(" ")} ]** · ${styleName(look.style)}`;

			const container = new ContainerBuilder().setAccentColor(
				enabled ? ACCENT.info : ACCENT_OFF
			);
			const head = [
				`## ${emojis.Guilty} ${lang.confession_panel_title}`,
				`${enabled ? emojis.Yes : emojis.No} **${enabled ? lang.confession_panel_state_on : lang.confession_panel_state_off}**`
			];
			if (flash) head.push("", flash);
			container.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(head.join("\n"))
			);
			container.addSeparatorComponents(
				new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
			);
			container.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					fieldLines([
						{
							emoji: emojis.Ticket_Hash,
							label: lang.confession_panel_field_channel,
							value: config.panel?.channelId
								? `<#${config.panel.channelId}>`
								: lang.confession_panel_no_channel
						},
						{
							emoji: emojis.Pages,
							label: lang.confession_panel_field_threads,
							value: threads
								? lang.confession_panel_value_on
								: lang.confession_panel_value_off
						},
						{
							emoji: emojis.Timer,
							label: lang.confession_panel_field_cooldown,
							value: client.timeCalculator.to_beautiful_string(
								config.cooldown ||
									client.timeCalculator.to_ms(
										DEFAULT_COOLDOWN
									),
								lang
							)
						},
						{
							emoji: emojis.Ticket_Preview,
							label: lang.confession_panel_field_embed,
							value: await embedLine(config)
						},
						{
							emoji: emojis.Ticket_Paint,
							label: lang.confession_panel_field_button,
							value: preview
						}
					])
				)
			);

			if (ended) {
				container.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`-# ${lang.confession_panel_expired} · ${signature}`
					)
				);
				return container;
			}

			container.addSeparatorComponents(
				new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
			);
			container.addActionRowComponents(
				new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
					new ChannelSelectMenuBuilder()
						.setCustomId(ID.channel)
						.setPlaceholder(
							lang.confession_panel_channel_placeholder
						)
						.setChannelTypes(
							ChannelType.GuildText,
							ChannelType.GuildAnnouncement
						)
						.setMinValues(1)
						.setMaxValues(1)
				)
			);
			container.addActionRowComponents(
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setCustomId(ID.toggle)
						.setLabel(
							enabled
								? lang.confession_panel_action_disable
								: lang.confession_panel_action_enable
						)
						.setEmoji(enabled ? emojis.Stop : emojis.Yes)
						.setStyle(
							enabled
								? ButtonStyle.Secondary
								: ButtonStyle.Success
						),
					new ButtonBuilder()
						.setCustomId(ID.threads)
						.setLabel(
							threads
								? lang.confession_panel_action_threads_off
								: lang.confession_panel_action_threads_on
						)
						.setEmoji(emojis.Pages)
						.setStyle(ButtonStyle.Secondary),
					new ButtonBuilder()
						.setCustomId(ID.cooldown)
						.setLabel(lang.confession_panel_action_cooldown)
						.setEmoji(emojis.Timer)
						.setStyle(ButtonStyle.Secondary)
				)
			);
			container.addActionRowComponents(
				new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
					new StringSelectMenuBuilder()
						.setCustomId(ID.style)
						.setPlaceholder(lang.confession_panel_style_placeholder)
						.addOptions(
							CONFESSION_BUTTON_STYLES.map((style) => ({
								label: styleName(style),
								value: style,
								emoji: STYLE_SWATCH[style],
								default: style === look.style
							}))
						)
				)
			);
			container.addActionRowComponents(
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setCustomId(ID.button)
						.setLabel(lang.confession_panel_action_edit_button)
						.setEmoji(emojis.Ticket_Paint)
						.setStyle(ButtonStyle.Primary),
					new ButtonBuilder()
						.setCustomId(ID.reset)
						.setLabel(lang.confession_panel_action_reset_button)
						.setEmoji(emojis.Restore)
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(!config.button),
					new ButtonBuilder()
						.setCustomId(ID.embed)
						.setLabel(lang.confession_panel_action_embed)
						.setEmoji(emojis.Ticket_Preview)
						.setStyle(ButtonStyle.Secondary)
				)
			);
			container.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(`-# ${signature}`)
			);
			return container;
		};

		const payload = async (config: Config, ended = false) => ({
			components: [await build(config, ended)],
			flags: [MessageFlags.IsComponentsV2] as const,
			allowedMentions: { parse: [] }
		});

		const message = client.func.method.isMessage(interaction)
			? await client.func.method.interactionSend(
					interaction,
					await payload(await load())
				)
			: await client.func.method.interactionSend(interaction, {
					...(await payload(await load())),
					flags: [
						MessageFlags.IsComponentsV2,
						MessageFlags.Ephemeral
					] as const
				});

		// A modal opened from a button; the unique id ignores stale submits.
		const askModal = async (
			i: ButtonInteraction,
			title: string,
			fields: {
				id: string;
				label: string;
				description: string;
				value?: string | null;
				placeholder?: string;
				required: boolean;
				max: number;
			}[]
		): Promise<ModalSubmitInteraction | null> => {
			const modalId = `confess-panel-modal-${i.id}`;
			const modal = new ModalBuilder()
				.setCustomId(modalId)
				.setTitle(title);
			for (const field of fields) {
				const input = new TextInputBuilder()
					.setCustomId(field.id)
					.setStyle(TextInputStyle.Short)
					.setRequired(field.required)
					.setMaxLength(field.max);
				if (field.value)
					input.setValue(field.value.slice(0, field.max));
				if (field.placeholder) input.setPlaceholder(field.placeholder);
				modal.addLabelComponents(
					new LabelBuilder()
						.setLabel(field.label)
						.setDescription(field.description.slice(0, 100))
						.setTextInputComponent(input)
				);
			}
			await i.showModal(modal);
			const submit = await i
				.awaitModalSubmit({
					time: MODAL_MS,
					filter: (s) =>
						s.customId === modalId && s.user.id === i.user.id
				})
				.catch(() => null);
			if (submit) await submit.deferUpdate();
			return submit;
		};

		// The card is re-read from the database after every change.
		const render = async (
			target: MessageComponentInteraction | ModalSubmitInteraction
		) => {
			await target.editReply(await payload(await load()));
		};

		// After a change of the panel's look: edit the posted panel at once.
		const appearanceSaved = async () => {
			const refreshed = await refreshConfessionPanel(client, guild);
			const config = await load();
			flash = yes(
				refreshed
					? lang.confession_panel_saved_refreshed
					: config.panel?.messageId
						? lang.confession_panel_saved_not_refreshed
						: lang.confession_panel_saved
			);
		};

		const postPanel = async (i: ChannelSelectMenuInteraction) => {
			const channel = guild.channels.cache.get(i.values[0]);
			if (!client.func.typeGuards.isGuildTextChannel(channel)) {
				flash = no(
					lang.confession_panel_send_failed.replace(
						"${channel}",
						`<#${i.values[0]}>`
					)
				);
				return;
			}
			const member = await guild.members
				.fetch(i.user.id)
				.catch(() => null);
			if (
				!member
					?.permissionsIn(channel)
					.has([
						PermissionFlagsBits.ViewChannel,
						PermissionFlagsBits.SendMessages
					])
			) {
				flash = no(
					lang.confession_panel_channel_no_access.replace(
						"${channel}",
						channel.toString()
					)
				);
				return;
			}

			const config = await load();
			const posted = await sendConfessionPanel(
				client,
				channel,
				lang,
				config
			).catch(() => null);
			if (!posted) {
				flash = no(
					lang.confession_panel_send_failed.replace(
						"${channel}",
						channel.toString()
					)
				);
				return;
			}
			await deleteConfessionPanelMessage(client, guild, config.panel);
			await client.db.set(`${path}.panel`, {
				channelId: posted.channelId,
				messageId: posted.id
			});
			flash = yes(
				lang.confession_panel_posted.replace(
					"${channel}",
					channel.toString()
				)
			);
			await client.func.ihorizon_logs(interaction, {
				title: lang.confession_channel_log_embed_title,
				description: lang.confession_channel_log_embed_desc
					.replace("${author}", `<@${i.user.id}>`)
					.replace("${channel}", channel.toString())
			});
		};

		const handle = async (i: Clicked) => {
			// Modals must be the first answer to the click.
			if (i.isButton()) {
				const config = await load();
				switch (i.customId) {
					case ID.cooldown: {
						const submit = await askModal(
							i,
							lang.confession_panel_modal_cooldown_title,
							[
								{
									id: ID.fieldCooldown,
									label: lang.confession_panel_modal_cooldown_label,
									description:
										lang.confession_panel_modal_cooldown_desc,
									placeholder: "5m",
									required: true,
									max: 20
								}
							]
						);
						if (!submit) return;
						const time = client.timeCalculator.to_ms(
							submit.fields
								.getTextInputValue(ID.fieldCooldown)
								.trim()
						);
						if (!time) {
							flash = no(lang.confession_panel_cooldown_invalid);
						} else {
							await client.db.set(`${path}.cooldown`, time);
							const pretty =
								client.timeCalculator.to_beautiful_string(
									time,
									lang
								);
							flash = yes(lang.confession_panel_saved);
							await client.func.ihorizon_logs(interaction, {
								title: lang.confession_cooldown_log_embed_title,
								description:
									lang.confession_cooldown_log_embed_desc
										.replace("${author}", `<@${i.user.id}>`)
										.replace("${time}", pretty)
							});
						}
						await render(submit);
						return;
					}

					case ID.button: {
						const submit = await askModal(
							i,
							lang.confession_panel_modal_button_title,
							[
								{
									id: ID.fieldLabel,
									label: lang.confession_panel_modal_label_label,
									description:
										lang.confession_panel_modal_label_desc.replace(
											"${default}",
											lang.confession_panel_button_default_label
										),
									value: config.button?.label,
									required: false,
									max: CONFESSION_LABEL_MAX
								},
								{
									id: ID.fieldEmoji,
									label: lang.confession_panel_modal_emoji_label,
									description:
										lang.confession_panel_modal_emoji_desc,
									value: config.button?.emoji,
									required: false,
									max: CONFESSION_EMOJI_MAX
								}
							]
						);
						if (!submit) return;
						const label = submit.fields
							.getTextInputValue(ID.fieldLabel)
							.trim()
							.slice(0, CONFESSION_LABEL_MAX);
						const emoji = submit.fields
							.getTextInputValue(ID.fieldEmoji)
							.trim();
						const custom = parseCustomEmoji(emoji);
						if (emoji && !isValidButtonEmoji(emoji)) {
							flash = no(lang.confession_panel_emoji_invalid);
						} else if (
							custom &&
							!botCanUseEmoji(client, guild, custom.id)
						) {
							flash = no(lang.confession_panel_emoji_unusable);
						} else {
							const current = (await load()).button;
							await client.db.set(`${path}.button`, {
								...current,
								label: label || null,
								emoji: emoji || null
							});
							await appearanceSaved();
						}
						await render(submit);
						return;
					}

					case ID.embed: {
						const submit = await askModal(
							i,
							lang.confession_panel_modal_embed_title,
							[
								{
									id: ID.fieldEmbed,
									label: lang.confession_panel_modal_embed_label,
									description:
										lang.confession_panel_modal_embed_desc,
									value: config.embedId,
									required: false,
									max: 200
								}
							]
						);
						if (!submit) return;
						const code = submit.fields
							.getTextInputValue(ID.fieldEmbed)
							.trim();
						if (!code) {
							await client.db.delete(`${path}.embedId`);
							await appearanceSaved();
						} else if (
							!(await readSavedEmbed(code, (key) =>
								metasTable.get(key)
							).catch(() => null))
						) {
							flash = no(
								lang.confession_panel_embed_not_found.replace(
									"${code}",
									code.replace(/`/g, "")
								)
							);
						} else {
							await client.db.set(`${path}.embedId`, code);
							await appearanceSaved();
						}
						await render(submit);
						return;
					}
				}
			}

			await i.deferUpdate();
			const config = await load();

			if (i.isChannelSelectMenu() && i.customId === ID.channel) {
				await postPanel(i);
			} else if (i.isStringSelectMenu() && i.customId === ID.style) {
				const style = i.values[0] as ConfessionButtonStyle;
				if (CONFESSION_BUTTON_STYLES.includes(style)) {
					await client.db.set(`${path}.button`, {
						...config.button,
						style
					});
					await appearanceSaved();
				}
			} else if (i.isButton()) {
				switch (i.customId) {
					case ID.toggle: {
						const disable = !config.disable;
						await client.db.set(`${path}.disable`, disable);
						flash = yes(
							disable
								? lang.confession_disable_command_work_off
								: lang.confession_disable_command_work_on
						);
						await client.func.ihorizon_logs(interaction, {
							title: lang.confession_log_embed_title_on_enable,
							description: (disable
								? lang.confession_log_embed_desc_on_disabled
								: lang.confession_log_embed_desc_on_enable
							).replace("${author}", `<@${i.user.id}>`)
						});
						break;
					}
					case ID.threads: {
						const thread = config.thread === "yes" ? "no" : "yes";
						await client.db.set(`${path}.thread`, thread);
						flash = yes(
							thread === "yes"
								? lang.confession_thread_enabled
								: lang.confession_thread_disabled
						);
						break;
					}
					case ID.reset:
						await client.db.delete(`${path}.button`);
						await appearanceSaved();
						break;
				}
			}
			await render(i);
		};

		const collector = message.createMessageComponentCollector({
			time: COLLECTOR_MS
		});

		collector.on("collect", async (i) => {
			if (
				!i.isButton() &&
				!i.isChannelSelectMenu() &&
				!i.isStringSelectMenu()
			)
				return;
			if (i.user.id !== authorId) {
				await i.reply({
					content: lang.help_not_for_you,
					flags: [MessageFlags.Ephemeral]
				});
				return;
			}
			collector.resetTimer();
			flash = null;
			try {
				await handle(i);
			} catch (e) {
				logger.err(
					`[confession panel] guild ${guild.id}: ${(e as Error).stack ?? e}`
				);
			}
		});

		collector.on("end", async () => {
			flash = null;
			const last = await payload(await load().catch(() => ({})), true);
			if (client.func.method.isMessage(interaction)) {
				await message.edit(last).catch(() => undefined);
			} else {
				await interaction.editReply(last).catch(() => undefined);
			}
		});
	}
};
