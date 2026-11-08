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
	Message
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";
import { SubCommand } from "../../../../types/command.js";
import {
	BackupBusyError,
	BackupLimitError
} from "../../../core/backup/src/index.js";
import {
	BACKUP_COMPONENTS,
	DEFAULT_BACKUP_COMPONENTS,
	MAX_BACKUPS_PER_USER,
	normalizeComponents,
	type BackupComponent
} from "../../../core/backup/src/components.js";
import {
	BACKUP_PANEL_TIMEOUT,
	canUseBackups,
	componentsLine,
	componentsSelect,
	isAuthor,
	showCard
} from "../../../core/modules/backupPanels.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	notice,
	sendCard
} from "../../../core/modules/uiCard.js";

const SELECT = "backup-create-select";
const ALL = "backup-create-all";
const CONFIRM = "backup-create-confirm";
const CANCEL = "backup-create-cancel";

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
		const authorId = interaction.member.user.id;
		const max = String(MAX_BACKUPS_PER_USER);
		const emojis = client.iHorizon_Emojis;

		if (!(await canUseBackups(client, guild, authorId))) {
			await sendCard(
				client,
				interaction,
				notice("danger", lang.backup_manage_nique_tes_mort)
			);
			return;
		}

		const used = Object.keys(
			await client.backup.getUserBackups(authorId)
		).length;
		if (used >= MAX_BACKUPS_PER_USER) {
			await sendCard(
				client,
				interaction,
				notice(
					"warning",
					lang.backup_limit_reached.replace("${max}", max)
				)
			);
			return;
		}

		const signature = await botSignature(client, guild.id);
		let selected: BackupComponent[] = [...DEFAULT_BACKUP_COMPONENTS];

		const render = () =>
			buildCard({
				accent: ACCENT.neutral,
				emoji: emojis.Backup_Main,
				title: lang.backup_create_title,
				description: lang.backup_create_desc.replace(
					"${guildName}",
					guild.name
				),
				blocks: [componentsLine(client, lang, selected)],
				footer: lang.backup_usage
					.replace("${count}", String(used))
					.replace("${max}", max),
				signature
			})
				.addActionRowComponents(
					componentsSelect(client, lang, SELECT, selected)
				)
				.addActionRowComponents(
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setCustomId(CONFIRM)
							.setLabel(lang.backup_btn_create)
							.setEmoji(emojis.Backup_Main)
							.setStyle(ButtonStyle.Success),
						new ButtonBuilder()
							.setCustomId(ALL)
							.setLabel(lang.backup_btn_all)
							.setStyle(ButtonStyle.Secondary),
						new ButtonBuilder()
							.setCustomId(CANCEL)
							.setLabel(lang.embed_btn_cancel)
							.setStyle(ButtonStyle.Danger)
					)
				);

		const message = await sendCard(client, interaction, render());
		const collector = message.createMessageComponentCollector({
			time: BACKUP_PANEL_TIMEOUT
		});
		let settled = false;

		collector.on("collect", async (i) => {
			if (!(await isAuthor(i, authorId, lang))) return;

			if (i.isStringSelectMenu() && i.customId === SELECT) {
				selected = normalizeComponents(i.values);
				await i.update({ components: [render()] });
				return;
			}
			if (i.customId === ALL) {
				selected = [...BACKUP_COMPONENTS];
				await i.update({ components: [render()] });
				return;
			}

			settled = true;
			collector.stop();

			if (i.customId === CANCEL) {
				await i.update({
					components: [notice("info", lang.backup_create_cancelled)]
				});
				return;
			}

			await i.update({
				components: [
					notice(
						"info",
						lang.backup_create_progress.replace(
							"${emoji}",
							emojis.Backup_Main
						)
					)
				]
			});

			try {
				const { data, count } = await client.backup.createForUser(
					guild,
					authorId,
					selected
				);
				await showCard(
					message,
					buildCard({
						accent: data.incomplete?.length
							? ACCENT.warning
							: ACCENT.success,
						emoji: emojis.Backup_Done,
						title: lang.backup_created_title,
						description: lang.backup_created_desc.replace(
							"${id}",
							data.id
						),
						blocks: [
							componentsLine(client, lang, data.components ?? []),
							!!data.incomplete?.length &&
								lang.backup_created_partial.replace(
									"${parts}",
									componentsLine(
										client,
										lang,
										data.incomplete
									)
								)
						],
						footer: lang.backup_usage
							.replace("${count}", String(count))
							.replace("${max}", max),
						signature
					})
				);
				await client.func.ihorizon_logs(interaction, {
					title: lang.backup_logs_embed_title_on_creation,
					description:
						lang.backup_logs_embed_description_on_creation.replace(
							"${authorId}",
							authorId
						)
				});
			} catch (error) {
				const text =
					error instanceof BackupLimitError
						? lang.backup_limit_reached.replace("${max}", max)
						: error instanceof BackupBusyError
							? lang.backup_busy
							: lang.backup_create_failed;
				if (
					!(error instanceof BackupLimitError) &&
					!(error instanceof BackupBusyError)
				) {
					logger.err(`Backup creation failed: ${error}`);
				}
				await showCard(message, notice("danger", text));
			}
		});

		collector.on("end", async () => {
			if (settled) return;
			await showCard(
				message,
				notice("warning", lang.backup_panel_expired)
			);
		});
	}
};
