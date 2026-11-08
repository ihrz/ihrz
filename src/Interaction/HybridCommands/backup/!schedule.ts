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
	Message,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";
import { SubCommand } from "../../../../types/command.js";
import {
	BACKUP_FREQUENCIES,
	computeNextRun,
	DEFAULT_BACKUP_COMPONENTS,
	frequencyKey,
	MAX_AUTO_BACKUPS_PER_GUILD,
	normalizeComponents,
	type BackupComponent,
	type BackupFrequency,
	type BackupFrequencyKey
} from "../../../core/backup/src/components.js";
import {
	BACKUP_PANEL_TIMEOUT,
	componentsLine,
	componentsSelect,
	frequencyLabel,
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

const FREQUENCY = "backup-schedule-frequency";
const COMPONENTS = "backup-schedule-components";
const SAVE = "backup-schedule-save";
const DISABLE = "backup-schedule-disable";

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
		const emojis = client.iHorizon_Emojis;

		if (guild.ownerId !== authorId) {
			await sendCard(
				client,
				interaction,
				notice("danger", lang.backup_schedule_owner_only)
			);
			return;
		}

		let current = await client.backup.getSchedule(guild.id);
		let frequency: BackupFrequency = current ?? BACKUP_FREQUENCIES["1w"];
		let selected: BackupComponent[] = current
			? normalizeComponents(current.components)
			: [...DEFAULT_BACKUP_COMPONENTS];
		const signature = await botSignature(client, guild.id);

		const frequencySelect = () =>
			new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				new StringSelectMenuBuilder()
					.setCustomId(FREQUENCY)
					.setPlaceholder(lang.backup_schedule_frequency_placeholder)
					.addOptions(
						Object.entries(BACKUP_FREQUENCIES).map(([key, value]) =>
							new StringSelectMenuOptionBuilder()
								.setValue(key)
								.setLabel(frequencyLabel(lang, value))
								.setEmoji(emojis.Backup_Schedule)
								.setDefault(key === frequencyKey(frequency))
						)
					)
			);

		const render = () => {
			const status = current
				? lang.backup_schedule_status_on
						.replace("${frequency}", frequencyLabel(lang, current))
						.replace(
							"${next}",
							`<t:${Math.floor(current.nextRunAt / 1000)}:R>`
						)
				: lang.backup_schedule_status_off;
			return buildCard({
				accent: current ? ACCENT.success : ACCENT.neutral,
				emoji: emojis.Backup_Schedule,
				title: lang.backup_schedule_title,
				description: lang.backup_schedule_desc.replace(
					"${maxAuto}",
					String(MAX_AUTO_BACKUPS_PER_GUILD)
				),
				blocks: [status, componentsLine(client, lang, selected)],
				signature
			})
				.addActionRowComponents(frequencySelect())
				.addActionRowComponents(
					componentsSelect(client, lang, COMPONENTS, selected)
				)
				.addActionRowComponents(
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setCustomId(SAVE)
							.setLabel(lang.backup_btn_schedule_save)
							.setEmoji(emojis.Backup_Schedule)
							.setStyle(ButtonStyle.Success),
						new ButtonBuilder()
							.setCustomId(DISABLE)
							.setLabel(lang.backup_btn_schedule_disable)
							.setStyle(ButtonStyle.Danger)
							.setDisabled(!current)
					)
				);
		};

		const message = await sendCard(client, interaction, render());
		const collector = message.createMessageComponentCollector({
			time: BACKUP_PANEL_TIMEOUT
		});

		collector.on("collect", async (i) => {
			if (!(await isAuthor(i, authorId, lang))) return;
			await i.deferUpdate();

			if (i.isStringSelectMenu() && i.customId === FREQUENCY) {
				frequency =
					BACKUP_FREQUENCIES[i.values[0] as BackupFrequencyKey];
			} else if (i.isStringSelectMenu() && i.customId === COMPONENTS) {
				selected = normalizeComponents(i.values);
			} else if (i.customId === SAVE) {
				current = {
					ownerId: authorId,
					every: frequency.every,
					unit: frequency.unit,
					components: selected,
					nextRunAt: computeNextRun(Date.now(), frequency),
					lastRunAt: current?.lastRunAt ?? null,
					lastError: null
				};
				await client.backup.saveSchedule(guild.id, current);
			} else if (i.customId === DISABLE) {
				await client.backup.removeSchedule(guild.id);
				current = null;
			}
			await i.editReply({ components: [render()] });
		});

		collector.on("end", async () => {
			await showCard(
				message,
				buildCard({
					accent: current ? ACCENT.success : ACCENT.neutral,
					emoji: emojis.Backup_Schedule,
					title: lang.backup_schedule_title,
					description: current
						? lang.backup_schedule_status_on
								.replace(
									"${frequency}",
									frequencyLabel(lang, current)
								)
								.replace(
									"${next}",
									`<t:${Math.floor(current.nextRunAt / 1000)}:R>`
								)
						: lang.backup_schedule_status_off,
					signature
				})
			);
		});
	}
};
