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
	normalizeComponents,
	type BackupComponent
} from "../../../core/backup/src/components.js";
import {
	BACKUP_PANEL_TIMEOUT,
	backupLoadRefusalText,
	componentsLine,
	componentsSelect,
	isAuthor,
	prepareBackupLoad,
	runBackupLoad,
	showCard
} from "../../../core/modules/backupPanels.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	cardPayload,
	notice,
	sendCard
} from "../../../core/modules/uiCard.js";

const SELECT = "backup-load-select";
const CONFIRM = "backup-load-confirm";
const CANCEL = "backup-load-cancel";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
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
		const refuse = (content: string) =>
			sendCard(client, interaction, notice("danger", content));

		const opts = client.func.method.options(interaction, args);
		const backupID = opts.string("backup-id", 0);

		const prepared = await prepareBackupLoad(
			client,
			guild,
			authorId,
			backupID
		);
		if (!prepared.ok) {
			await refuse(backupLoadRefusalText(lang, prepared.reason));
			return;
		}
		const { backup, available } = prepared;
		let selected: BackupComponent[] = [...available];
		const signature = await botSignature(client, guild.id);

		const render = () =>
			buildCard({
				accent: ACCENT.danger,
				emoji: emojis.Backup_Restore,
				title: lang.backup_load_title,
				description: lang.backup_load_desc
					.replace("${guildName}", backup.data.name)
					.replace(
						"${date}",
						`<t:${Math.floor(backup.data.createdTimestamp / 1000)}:f>`
					),
				blocks: [
					componentsLine(client, lang, selected),
					lang.backup_load_warning
				],
				signature
			})
				.addActionRowComponents(
					componentsSelect(client, lang, SELECT, selected, available)
				)
				.addActionRowComponents(
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setCustomId(CONFIRM)
							.setLabel(lang.backup_btn_load)
							.setEmoji(emojis.Backup_Restore)
							.setStyle(ButtonStyle.Danger),
						new ButtonBuilder()
							.setCustomId(CANCEL)
							.setLabel(lang.embed_btn_cancel)
							.setStyle(ButtonStyle.Secondary)
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

			settled = true;
			collector.stop();

			if (i.customId === CANCEL) {
				await i.update({
					components: [notice("info", lang.backup_not_load)]
				});
				return;
			}

			await i.update({
				components: [
					notice(
						"info",
						lang.backup_load_progress.replace(
							"${emoji}",
							emojis.Backup_Restore
						)
					)
				]
			});

			// Restoring channels deletes this one: the result goes by DM then.
			const finish = async (card: ReturnType<typeof notice>) => {
				if (message.channel && !selected.includes("channels")) {
					await showCard(message, card);
					return;
				}
				const user = await client.users
					.fetch(authorId)
					.catch(() => null);
				await user
					?.send(cardPayload(card) as never)
					.catch(() => undefined);
			};

			await finish(
				await runBackupLoad(
					client,
					lang,
					guild,
					backup.data,
					backupID!,
					selected,
					signature
				)
			);
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
