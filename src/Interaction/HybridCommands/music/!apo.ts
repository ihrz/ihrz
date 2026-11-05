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
	Attachment,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	ChatInputCommandInteraction,
	Client,
	ContainerBuilder,
	FileUploadBuilder,
	LabelBuilder,
	Message,
	MessageFlags,
	ModalBuilder,
	ModalSubmitInteraction,
	PermissionFlagsBits,
	SectionBuilder,
	SeparatorBuilder,
	SeparatorSpacingSize,
	TextDisplayBuilder,
	TextInputBuilder,
	TextInputStyle,
	escapeMarkdown
} from "discord.js";
import { LanguageData } from "../../../../types/languageData.js";

import { SubCommand } from "../../../../types/command.js";
import logger from "../../../core/logger.js";
import {
	applyApoFilter,
	checkApo,
	loadApoState,
	saveApoState
} from "../../../core/modules/musicApo.js";
import {
	APO_MAX_BYTES,
	APO_MAX_CONFIGS,
	APO_MAX_LINES,
	APO_NAME_MAX,
	ApoConfig,
	ApoState,
	activeConfig,
	addConfig,
	canUnfreeze,
	checkName,
	checkText,
	cleanName,
	commandLines,
	removeConfig,
	updateConfig
} from "../../../core/modules/musicApoState.js";
import { ACCENT, botSignature } from "../../../core/modules/uiCard.js";

// How long the panel answers its buttons, and how long a modal may stay open.
const COLLECTOR_MS = 10 * 60 * 1000;
const MODAL_MS = 5 * 60 * 1000;
// Skipped lines shown after a save (the node reports up to 100).
const SHOWN_WARNINGS = 5;
const ACCENT_OFF = 0x4f545c;

const ID = {
	manage: "apo-manage:",
	apply: "apo-apply",
	unapply: "apo-unapply",
	rename: "apo-rename",
	replace: "apo-replace",
	freeze: "apo-freeze",
	unfreeze: "apo-unfreeze",
	delete: "apo-delete",
	confirm: "apo-confirm",
	cancel: "apo-cancel",
	add: "apo-add",
	toggle: "apo-toggle",
	fieldName: "apo-name",
	fieldFile: "apo-file"
} as const;

type Outcome =
	| { ok: true; stages: number; warnings: string[] }
	| { ok: false; error: string };

// /music apo [file]: the server's Equalizer APO panel. Administrators, the
// server owners and the bot owners keep up to five configs, pick the one
// applied to everything the server plays, rename, replace, freeze or delete
// them, and switch the module off. An attached file is added as a config.
export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		// Guard's Typing
		if (
			!client.user ||
			!interaction.member ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const guild = interaction.guild;
		const emojis = client.iHorizon_Emojis;
		const authorId =
			interaction instanceof Message
				? interaction.author.id
				: interaction.user.id;

		const isOwner = async (userId: string) =>
			(await client.func.ownerHelper.isGuildOwner(userId, guild)) ||
			(await client.func.ownerHelper.isBotOwner(userId));

		if (
			!interaction.member.permissions.has(
				PermissionFlagsBits.Administrator
			) &&
			!(await isOwner(authorId))
		) {
			await client.func.method.interactionSend(interaction, {
				content: lang.music_apo_no_permission.replace(
					"${emoji}",
					emojis.No
				)
			});
			return;
		}

		const no = (text: string) =>
			text
				.replace("${emoji}", emojis.No)
				.replace("${emoji_No}", emojis.No);
		const kib = String(APO_MAX_BYTES / 1024);
		const signature = await botSignature(client, guild.id);

		// Download an uploaded file within the limits.
		const readFile = async (
			file: Attachment
		): Promise<{ text: string } | { error: string }> => {
			if (!/\.txt$/i.test(file.name))
				return { error: no(lang.music_apo_not_txt) };
			if (file.size > APO_MAX_BYTES)
				return {
					error: no(lang.music_apo_too_big).replace("${kb}", kib)
				};
			try {
				const res = await fetch(file.url, {
					signal: AbortSignal.timeout(10_000)
				});
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const bytes = await res.arrayBuffer();
				if (bytes.byteLength > APO_MAX_BYTES) {
					return {
						error: no(lang.music_apo_too_big).replace("${kb}", kib)
					};
				}
				return {
					text: new TextDecoder().decode(bytes).replace(/^﻿/, "")
				};
			} catch {
				return { error: no(lang.music_apo_download_failed) };
			}
		};

		// The panel's limits, then the node's own parser (Wavyzon only).
		const validate = async (text: string): Promise<Outcome> => {
			switch (checkText(text)) {
				case "empty":
					return { ok: false, error: no(lang.music_apo_empty_file) };
				case "too_big":
					return {
						ok: false,
						error: no(lang.music_apo_too_big).replace("${kb}", kib)
					};
				case "too_many_lines":
					return {
						ok: false,
						error: no(lang.music_apo_too_many_lines).replace(
							"${lines}",
							String(APO_MAX_LINES)
						)
					};
			}
			const node =
				client.player.getPlayer(guild.id)?.node ??
				client.player.nodeManager.leastUsedNodes("playingPlayers")[0];
			if (!node) return { ok: false, error: no(lang.music_apo_no_node) };
			const check = await checkApo(node, text);
			if (check.ok)
				return {
					ok: true,
					stages: check.stages.length,
					warnings: check.warnings
				};
			return {
				ok: false,
				error: check.unsupported
					? no(lang.music_apo_unsupported)
					: no(lang.music_apo_invalid).replace(
							"${error}",
							escapeMarkdown(check.error).slice(0, 1500)
						)
			};
		};

		const nameError = (
			state: ApoState,
			name: string,
			exceptId?: string
		): string | null => {
			switch (checkName(state, name, exceptId)) {
				case "empty":
					return no(lang.music_apo_name_empty);
				case "taken":
					return no(lang.music_apo_name_taken).replace(
						"${name}",
						escapeMarkdown(cleanName(name))
					);
			}
			return null;
		};

		const savedText = (
			name: string,
			outcome: Extract<Outcome, { ok: true }>
		): string => {
			let text = lang.music_apo_saved
				.replace("${emoji}", emojis.Yes)
				.replace("${name}", escapeMarkdown(cleanName(name)))
				.replace("${stages}", String(outcome.stages));
			if (outcome.warnings.length) {
				const shown = outcome.warnings
					.slice(0, SHOWN_WARNINGS)
					.map((w) => w.slice(0, 180))
					.join("\n")
					.replace(/```/g, "'''");
				text += `\n${lang.music_apo_warnings.replace("${count}", String(outcome.warnings.length))}\n\`\`\`\n${shown}\n\`\`\``;
			}
			return text;
		};

		// Save, then bring the playing music in line when the applied text changed.
		const commit = async (before: ApoState, after: ApoState) => {
			await saveApoState(guild.id, after);
			const was = activeConfig(before)?.config ?? null;
			const now = activeConfig(after)?.config ?? null;
			const player = client.player.getPlayer(guild.id);
			if (player && was !== now) {
				await applyApoFilter(player, now).catch((e) =>
					logger.warn(
						`[music apo] guild ${guild.id}: live apply failed (${(e as Error).message})`
					)
				);
			}
		};

		const size = (text: string) => {
			const bytes = Buffer.byteLength(text, "utf-8");
			return bytes < 1024
				? `${bytes} B`
				: `${(bytes / 1024).toFixed(1)} KiB`;
		};

		const button = (
			id: string,
			label: string,
			emoji: string,
			style: ButtonStyle,
			disabled = false
		) =>
			new ButtonBuilder()
				.setCustomId(id)
				.setLabel(label)
				.setEmoji(emoji)
				.setStyle(style)
				.setDisabled(disabled);

		let selected: string | null = null;
		let confirming = false;
		let flash: string | null = null;

		const build = (state: ApoState, ended = false): ContainerBuilder => {
			const applied = activeConfig({ ...state, enabled: true });
			const container = new ContainerBuilder().setAccentColor(
				state.enabled ? ACCENT.info : ACCENT_OFF
			);

			const head = [
				`## ${emojis.Music_Icon} ${lang.music_apo_panel_title}`,
				`${state.enabled ? emojis.Yes : emojis.No} **${state.enabled ? lang.music_apo_panel_on : lang.music_apo_panel_off}** · ${
					applied
						? lang.music_apo_panel_applied.replace(
								"${name}",
								escapeMarkdown(applied.name)
							)
						: lang.music_apo_panel_nothing_applied
				}`,
				`-# ${lang.music_apo_panel_count
					.replace("${count}", String(state.configs.length))
					.replace("${max}", String(APO_MAX_CONFIGS))}`
			];
			if (flash) head.push("", flash);
			container.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(head.join("\n"))
			);
			container.addSeparatorComponents(
				new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
			);

			if (!state.configs.length) {
				container.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`-# ${lang.music_apo_panel_empty}`
					)
				);
			}

			for (const config of state.configs) {
				const isSelected = config.id === selected;
				const badges = [
					state.active === config.id
						? `${emojis.Player_Play} ${lang.music_apo_badge_applied}`
						: null,
					config.frozen
						? `${emojis.Lock} ${lang.music_apo_badge_frozen}`
						: null
				].filter(Boolean);
				const meta = lang.music_apo_config_meta
					.replace("${user}", `<@${config.updatedBy ?? config.by}>`)
					.replace(
						"${time}",
						`<t:${Math.floor((config.updatedAt ?? config.at) / 1000)}:R>`
					)
					.replace("${lines}", String(commandLines(config.config)))
					.replace("${size}", size(config.config));
				container.addSectionComponents(
					new SectionBuilder()
						.addTextDisplayComponents(
							new TextDisplayBuilder().setContent(
								`**${escapeMarkdown(config.name)}**${badges.length ? ` · ${badges.join(" · ")}` : ""}\n-# ${meta}`
							)
						)
						.setButtonAccessory(
							button(
								`${ID.manage}${config.id}`,
								lang.music_apo_button_manage,
								emojis.Gear,
								isSelected
									? ButtonStyle.Primary
									: ButtonStyle.Secondary,
								ended
							)
						)
				);
				if (!isSelected || ended) continue;

				if (config.frozen) {
					container.addTextDisplayComponents(
						new TextDisplayBuilder().setContent(
							`-# ${emojis.Lock} ${lang.music_apo_frozen_note.replace("${user}", `<@${config.frozen.by}>`)}`
						)
					);
				}
				if (confirming) {
					container.addTextDisplayComponents(
						new TextDisplayBuilder().setContent(
							lang.music_apo_confirm_delete.replace(
								"${name}",
								escapeMarkdown(config.name)
							)
						)
					);
					container.addActionRowComponents(
						new ActionRowBuilder<ButtonBuilder>().addComponents(
							button(
								ID.confirm,
								lang.music_apo_button_confirm_delete,
								emojis.Ticket_Trash,
								ButtonStyle.Danger
							),
							button(
								ID.cancel,
								lang.music_apo_button_cancel,
								emojis.No,
								ButtonStyle.Secondary
							)
						)
					);
					continue;
				}
				const frozen = !!config.frozen;
				container.addActionRowComponents(
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						state.active === config.id
							? button(
									ID.unapply,
									lang.music_apo_button_unapply,
									emojis.Player_Stop,
									ButtonStyle.Secondary
								)
							: button(
									ID.apply,
									lang.music_apo_button_apply,
									emojis.Player_Play,
									ButtonStyle.Success
								),
						button(
							ID.rename,
							lang.music_apo_button_rename,
							emojis.Nametag,
							ButtonStyle.Secondary,
							frozen
						),
						button(
							ID.replace,
							lang.music_apo_button_replace,
							emojis.Paper,
							ButtonStyle.Secondary,
							frozen
						),
						frozen
							? button(
									ID.unfreeze,
									lang.music_apo_button_unfreeze,
									emojis.Unlock,
									ButtonStyle.Secondary
								)
							: button(
									ID.freeze,
									lang.music_apo_button_freeze,
									emojis.Lock,
									ButtonStyle.Secondary
								),
						button(
							ID.delete,
							lang.music_apo_button_delete,
							emojis.Ticket_Trash,
							ButtonStyle.Danger,
							frozen
						)
					)
				);
			}

			container.addSeparatorComponents(
				new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
			);
			container.addActionRowComponents(
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					button(
						ID.add,
						lang.music_apo_button_add,
						emojis.Plus,
						ButtonStyle.Success,
						ended || state.configs.length >= APO_MAX_CONFIGS
					),
					state.enabled
						? button(
								ID.toggle,
								lang.music_apo_button_disable,
								emojis.Stop,
								ButtonStyle.Secondary,
								ended
							)
						: button(
								ID.toggle,
								lang.music_apo_button_enable,
								emojis.Yes,
								ButtonStyle.Primary,
								ended
							)
				)
			);
			container.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(`-# ${signature}`)
			);
			return container;
		};

		const payload = (state: ApoState, ended = false) => ({
			components: [build(state, ended)],
			flags: [MessageFlags.IsComponentsV2] as const,
			allowedMentions: { parse: [] }
		});

		// Shortcut: a file attached to the command becomes a new config.
		let state = await loadApoState(guild.id);
		const attachment: Attachment | null =
			interaction instanceof ChatInputCommandInteraction
				? interaction.options.getAttachment("file")
				: (interaction.attachments.first() ?? null);
		if (attachment) {
			const name = cleanName(attachment.name);
			const read = await readFile(attachment);
			if (state.configs.length >= APO_MAX_CONFIGS) {
				flash = no(lang.music_apo_full).replace(
					"${max}",
					String(APO_MAX_CONFIGS)
				);
			} else if ("error" in read) {
				flash = read.error;
			} else {
				const bad = nameError(state, name);
				const outcome = bad ? null : await validate(read.text);
				if (bad) flash = bad;
				else if (outcome && !outcome.ok) flash = outcome.error;
				else if (outcome?.ok) {
					const next = addConfig(state, name, read.text, authorId);
					await commit(state, next);
					state = next;
					selected = next.configs[next.configs.length - 1].id;
					flash = savedText(name, outcome);
				}
			}
		}

		const message = await client.func.method.interactionSend(
			interaction,
			payload(state)
		);
		flash = null;

		const ephemeral = (
			i: ButtonInteraction | ModalSubmitInteraction,
			content: string
		) =>
			(i.deferred || i.replied ? i.followUp.bind(i) : i.reply.bind(i))({
				content,
				flags: [MessageFlags.Ephemeral],
				allowedMentions: { parse: [] }
			});

		// A modal opened from a button; the unique id ignores stale submits.
		const askModal = async (
			i: ButtonInteraction,
			title: string,
			fields: { name?: string | null; file?: boolean }
		): Promise<ModalSubmitInteraction | null> => {
			const modalId = `apo-modal-${i.id}`;
			const modal = new ModalBuilder()
				.setCustomId(modalId)
				.setTitle(title);
			if (fields.name !== undefined) {
				const input = new TextInputBuilder()
					.setCustomId(ID.fieldName)
					.setStyle(TextInputStyle.Short)
					.setRequired(true)
					.setMinLength(1)
					.setMaxLength(APO_NAME_MAX);
				if (fields.name) input.setValue(fields.name);
				modal.addLabelComponents(
					new LabelBuilder()
						.setLabel(lang.music_apo_field_name)
						.setDescription(
							lang.music_apo_field_name_desc.replace(
								"${max}",
								String(APO_NAME_MAX)
							)
						)
						.setTextInputComponent(input)
				);
			}
			if (fields.file) {
				modal.addLabelComponents(
					new LabelBuilder()
						.setLabel(lang.music_apo_field_file)
						.setDescription(
							lang.music_apo_field_file_desc
								.replace("${kb}", kib)
								.replace("${lines}", String(APO_MAX_LINES))
						)
						.setFileUploadComponent(
							new FileUploadBuilder()
								.setCustomId(ID.fieldFile)
								.setRequired(true)
								.setMinValues(1)
								.setMaxValues(1)
						)
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

		const collector = message.createMessageComponentCollector({
			time: COLLECTOR_MS
		});

		collector.on("collect", async (i) => {
			if (!i.isButton()) return;
			if (i.user.id !== authorId) {
				await i.reply({
					content: lang.help_not_for_you,
					flags: [MessageFlags.Ephemeral]
				});
				return;
			}
			collector.resetTimer();
			try {
				await handle(i);
			} catch (e) {
				logger.err(
					`[music apo] guild ${guild.id}: ${(e as Error).stack ?? e}`
				);
			}
		});

		const handle = async (i: ButtonInteraction) => {
			// Another panel may have changed things: always start from the database.
			let current = await loadApoState(guild.id);
			if (i.customId.startsWith(ID.manage)) {
				const id = i.customId.slice(ID.manage.length);
				selected = selected === id ? null : id;
				confirming = false;
				await i.update(payload(current));
				return;
			}

			const config: ApoConfig | undefined = current.configs.find(
				(c) => c.id === selected
			);
			const frozenError = (c: ApoConfig) =>
				no(lang.music_apo_frozen).replace(
					"${name}",
					escapeMarkdown(c.name)
				);
			const refresh = (
				target: ButtonInteraction | ModalSubmitInteraction
			) =>
				target instanceof ButtonInteraction
					? target.update(payload(current))
					: target.editReply(payload(current));
			const change = async (next: ApoState) => {
				await commit(current, next);
				current = next;
			};

			switch (i.customId) {
				case ID.toggle:
					await change({ ...current, enabled: !current.enabled });
					await refresh(i);
					return;

				case ID.add: {
					if (current.configs.length >= APO_MAX_CONFIGS) {
						await ephemeral(
							i,
							no(lang.music_apo_full).replace(
								"${max}",
								String(APO_MAX_CONFIGS)
							)
						);
						return;
					}
					const submit = await askModal(
						i,
						lang.music_apo_modal_add_title,
						{ name: null, file: true }
					);
					if (!submit) return;
					const name = submit.fields.getTextInputValue(ID.fieldName);
					const file = submit.fields
						.getUploadedFiles(ID.fieldFile, true)
						.first();
					current = await loadApoState(guild.id);
					if (current.configs.length >= APO_MAX_CONFIGS) {
						await ephemeral(
							submit,
							no(lang.music_apo_full).replace(
								"${max}",
								String(APO_MAX_CONFIGS)
							)
						);
						return;
					}
					const bad = nameError(current, name);
					if (bad || !file) {
						await ephemeral(
							submit,
							bad ?? no(lang.music_apo_not_txt)
						);
						return;
					}
					const read = await readFile(file);
					if ("error" in read) {
						await ephemeral(submit, read.error);
						return;
					}
					const outcome = await validate(read.text);
					if (!outcome.ok) {
						await ephemeral(submit, outcome.error);
						return;
					}
					await change(
						addConfig(current, name, read.text, i.user.id)
					);
					selected = current.configs[current.configs.length - 1].id;
					confirming = false;
					await refresh(submit);
					await ephemeral(submit, savedText(name, outcome));
					return;
				}
			}

			if (!config) {
				// The selected config was deleted elsewhere.
				selected = null;
				confirming = false;
				await refresh(i);
				return;
			}

			switch (i.customId) {
				case ID.apply:
					await change({ ...current, active: config.id });
					await refresh(i);
					return;

				case ID.unapply:
					await change({ ...current, active: null });
					await refresh(i);
					return;

				case ID.freeze:
					await change(
						updateConfig(
							current,
							config.id,
							{ frozen: { by: i.user.id, at: Date.now() } },
							i.user.id
						)
					);
					await refresh(i);
					return;

				case ID.unfreeze:
					if (
						!canUnfreeze(
							config,
							i.user.id,
							await isOwner(i.user.id)
						)
					) {
						await ephemeral(
							i,
							no(lang.music_apo_cannot_unfreeze).replace(
								"${user}",
								`<@${config.frozen?.by}>`
							)
						);
						return;
					}
					await change(
						updateConfig(
							current,
							config.id,
							{ frozen: null },
							i.user.id
						)
					);
					await refresh(i);
					return;

				case ID.delete:
					if (config.frozen) {
						await ephemeral(i, frozenError(config));
						return;
					}
					confirming = true;
					await refresh(i);
					return;

				case ID.cancel:
					confirming = false;
					await refresh(i);
					return;

				case ID.confirm:
					confirming = false;
					if (config.frozen) {
						await refresh(i);
						await ephemeral(i, frozenError(config));
						return;
					}
					await change(removeConfig(current, config.id));
					selected = null;
					await refresh(i);
					return;

				case ID.rename: {
					if (config.frozen) {
						await ephemeral(i, frozenError(config));
						return;
					}
					const submit = await askModal(
						i,
						lang.music_apo_modal_rename_title,
						{ name: config.name }
					);
					if (!submit) return;
					const name = submit.fields.getTextInputValue(ID.fieldName);
					current = await loadApoState(guild.id);
					const target = current.configs.find(
						(c) => c.id === config.id
					);
					if (!target || target.frozen) {
						await refresh(submit);
						if (target)
							await ephemeral(submit, frozenError(target));
						return;
					}
					const bad = nameError(current, name, config.id);
					if (bad) {
						await ephemeral(submit, bad);
						return;
					}
					await change(
						updateConfig(current, config.id, { name }, i.user.id)
					);
					await refresh(submit);
					return;
				}

				case ID.replace: {
					if (config.frozen) {
						await ephemeral(i, frozenError(config));
						return;
					}
					const submit = await askModal(
						i,
						lang.music_apo_modal_replace_title,
						{ file: true }
					);
					if (!submit) return;
					const file = submit.fields
						.getUploadedFiles(ID.fieldFile, true)
						.first();
					if (!file) {
						await ephemeral(submit, no(lang.music_apo_not_txt));
						return;
					}
					const read = await readFile(file);
					if ("error" in read) {
						await ephemeral(submit, read.error);
						return;
					}
					const outcome = await validate(read.text);
					if (!outcome.ok) {
						await ephemeral(submit, outcome.error);
						return;
					}
					current = await loadApoState(guild.id);
					const target = current.configs.find(
						(c) => c.id === config.id
					);
					if (!target || target.frozen) {
						await refresh(submit);
						if (target)
							await ephemeral(submit, frozenError(target));
						return;
					}
					await change(
						updateConfig(
							current,
							config.id,
							{ config: read.text },
							i.user.id
						)
					);
					await refresh(submit);
					await ephemeral(submit, savedText(target.name, outcome));
					return;
				}
			}
		};

		collector.on("end", async () => {
			const last = await loadApoState(guild.id).catch(() => state);
			selected = null;
			confirming = false;
			await message.edit(payload(last, true)).catch(() => undefined);
		});
	}
};
