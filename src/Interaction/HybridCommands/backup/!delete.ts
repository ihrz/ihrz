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
import { isAuthor, showCard } from "../../../core/modules/backupPanels.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	notice,
	sendCard
} from "../../../core/modules/uiCard.js";

const CONFIRM = "backup-delete-confirm";
const CANCEL = "backup-delete-cancel";

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

		const authorId = interaction.member.user.id;
		const emojis = client.iHorizon_Emojis;
		const opts = client.func.method.options(interaction, args);
		const backupID = opts.string("backup-id", 0) as string;

		const index = await client.backup.getUserBackups(authorId);
		const entry = index[backupID];
		if (!Object.hasOwn(index, backupID)) {
			await sendCard(
				client,
				interaction,
				notice("danger", lang.backup_this_is_not_your_backup)
			);
			return;
		}

		const message = await sendCard(
			client,
			interaction,
			buildCard({
				accent: ACCENT.danger,
				emoji: emojis.Backup_Delete,
				title: lang.backup_delete_title,
				description: lang.backup_delete_desc
					.replace("${guildName}", entry.guildName)
					.replace("${id}", backupID)
					.replace("${categoryCount}", String(entry.categoryCount))
					.replace("${channelCount}", String(entry.channelCount)),
				signature: await botSignature(client, interaction.guildId)
			}).addActionRowComponents(
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setCustomId(CONFIRM)
						.setLabel(lang.backup_confirm_button)
						.setEmoji(emojis.Backup_Delete)
						.setStyle(ButtonStyle.Danger),
					new ButtonBuilder()
						.setCustomId(CANCEL)
						.setLabel(lang.backup_cancel_button)
						.setStyle(ButtonStyle.Secondary)
				)
			)
		);

		const collector = message.createMessageComponentCollector({
			time: 30_000
		});
		let settled = false;

		collector.on("collect", async (i) => {
			if (!(await isAuthor(i, authorId, lang))) return;
			settled = true;
			collector.stop();

			// Deleting can outlast the 3 seconds Discord gives to answer.
			await i.deferUpdate();

			if (i.customId === CONFIRM) {
				await client.backup.removeForUser(authorId, backupID);
				await i.editReply({
					components: [notice("success", lang.backup_delete_done)]
				});
				return;
			}
			await i.editReply({
				components: [notice("info", lang.backup_delete_cancelled)]
			});
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
