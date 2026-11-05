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
	Message,
	escapeMarkdown
} from "discord.js";

import { LanguageData } from "../../../../../types/languageData.js";
import { SubCommand } from "../../../../../types/command.js";
import { DatabaseStructure } from "../../../../../types/database_structure.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	pageLabel,
	sendPaginatedCard
} from "../../../../core/modules/uiCard.js";

const PER_PAGE = 10;

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
					"${emoji_No}",
					client.iHorizon_Emojis.No
				)
			});
			return;
		}

		entries.sort(([, a], [, b]) => (b?.lockedAt ?? 0) - (a?.lockedAt ?? 0));

		const lines = entries.map(([memberId, lockData]) => {
			const nick = lockData?.nick
				? `**${escapeMarkdown(lockData.nick)}**`
				: lang.var_no_set;
			const sub: string[] = [];
			if (lockData?.lockedBy)
				sub.push(
					lang.util_locknamelist_card_by.replace(
						"${user}",
						`<@${lockData.lockedBy}>`
					)
				);
			if (lockData?.lockedAt) {
				// `/utilss lockname` stores Date.now(); accept seconds too.
				const seconds =
					lockData.lockedAt > 1e12
						? Math.floor(lockData.lockedAt / 1000)
						: lockData.lockedAt;
				sub.push(`<t:${seconds}:D> · <t:${seconds}:R>`);
			}
			return `<@${memberId}> · ${nick}${sub.length ? `\n-# ${sub.join(" · ")}` : ""}`;
		});

		const pages = Math.ceil(lines.length / PER_PAGE);
		const signature = await botSignature(client, interaction.guildId);

		await sendPaginatedCard({
			client,
			interaction,
			lang,
			pages,
			render: (page) =>
				buildCard({
					accent: ACCENT.info,
					emoji: client.iHorizon_Emojis.Lock,
					title: lang.util_locknamelist_embed_title,
					description: `-# ${lang.util_locknamelist_card_count.replace("${count}", String(entries.length))}`,
					blocks: [
						lines
							.slice(page * PER_PAGE, (page + 1) * PER_PAGE)
							.join("\n")
					],
					footer: pageLabel(lang, page, pages),
					signature
				})
		});

		return;
	}
};
