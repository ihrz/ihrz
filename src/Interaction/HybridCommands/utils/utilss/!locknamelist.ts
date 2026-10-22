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
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
	Message
} from "discord.js";

import { LanguageData } from "../../../../../types/languageData.js";
import { SubCommand } from "../../../../../types/command.js";
import { DatabaseStructure } from "../../../../../types/database_structure.js";

const LOCKLIST_ACCENT_COLOR = "#9a5af2";

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

		const lockedList = await client.db.get<
			Record<string, DatabaseStructure.LockNameData | undefined>
		>(`${interaction.guildId}.LOCKNAME`);

		const entries = Object.entries(lockedList || {}).filter(
			([, lockData]) => lockData !== undefined
		);

		if (entries.length === 0) {
			await client.func.method.interactionSend(interaction, {
				content: lang.util_locknamelist_empty.replace(
					"${client.iHorizon_Emojis.No}",
					client.iHorizon_Emojis.No
				)
			});
			return;
		}

		entries.sort(([, a], [, b]) => (b?.lockedAt ?? 0) - (a?.lockedAt ?? 0));

		const lines = entries
			.map(([memberId, lockData]) => {
				if (!lockData) return "";

				return lockData.lockedAt && lockData.lockedBy
					? lang.util_locknamelist_embed_line
							.replace("${member.id}", memberId)
							.replace(
								"${nick}",
								lockData.nick || lang.var_no_set
							)
							.replace("${lockedBy}", `<@${lockData.lockedBy}>`)
							.replace("${lockedAt}", String(lockData.lockedAt))
					: lang.util_locknamelist_embed_line_short
							.replace("${member.id}", memberId)
							.replace(
								"${nick}",
								lockData.nick || lang.var_no_set
							);
			})
			.filter(Boolean)
			.join("\n");

		const embed = new EmbedBuilder()
			.setColor(LOCKLIST_ACCENT_COLOR)
			.setTitle(lang.util_locknamelist_embed_title)
			.setDescription(
				`${lang.util_locknamelist_embed_count.replace(
					"${count}",
					String(entries.length)
				)}\n\n${lines}`.substring(0, 4000)
			);

		await client.func.method.interactionSend(interaction, {
			embeds: [embed]
		});

		return;
	}
};
