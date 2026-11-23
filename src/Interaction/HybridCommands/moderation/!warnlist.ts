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
	Client,
	ChatInputCommandInteraction,
	GuildMember,
	Message
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";

import { getWarns } from "../../../core/modules/moderationOps.js";
import {
	getWarnConfig,
	isWarnExpired
} from "../../../core/modules/warnSystem.js";

import { SubCommand } from "../../../../types/command.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	pageLabel,
	sendPaginatedCard
} from "../../../core/modules/uiCard.js";

const PER_PAGE = 5;

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

		const opts = client.func.method.options(interaction, args);
		const member = opts.member("member", 0) as GuildMember | null;

		const allWarns = member
			? await getWarns(interaction.guild, member.id)
			: [];

		if (!allWarns || allWarns.length === 0) {
			await client.func.method.interactionSend(interaction, {
				content: lang.warnlist_no_data
					.replace("${emoji_No}", client.iHorizon_Emojis.No)
					.replace("${member}", member?.toString()!)
			});
			return;
		}

		const e = client.iHorizon_Emojis;
		// Newest first; expired warnings stay in the history, marked.
		const config = await getWarnConfig(interaction.guild);
		const now = Date.now();
		allWarns.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
		const active = allWarns.filter(
			(w) => !isWarnExpired(w, config, now)
		).length;
		const countLine = lang.warnlist_card_active
			.replace("${active}", String(active))
			.replace("${count}", String(allWarns.length));
		const expiryLine = config.expireDays
			? ` · ${lang.warn_expire_note.replace("${days}", String(config.expireDays))}`
			: "";
		const pages = Math.ceil(allWarns.length / PER_PAGE);
		const signature = await botSignature(client, interaction.guildId);

		await sendPaginatedCard({
			client,
			interaction,
			lang,
			pages,
			timeoutMs: 60_000 * 15,
			render: (page) =>
				buildCard({
					accent: ACCENT.warning,
					emoji: e.Warn,
					title: lang.warnlist_card_title.replace(
						"${user}",
						member?.displayName ?? lang.var_unknown
					),
					description: `${member ?? ""}\n-# ${countLine}${expiryLine}`,
					thumbnail: member?.displayAvatarURL({ size: 128 }),
					blocks: allWarns
						.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)
						.map((x) => {
							const at = Math.floor(x.timestamp / 1000);
							const expired = isWarnExpired(x, config, now);
							return [
								`${expired ? "~~" : ""}**\`${x.id}\`** · ${x.reason}${expired ? `~~ · *${lang.warnlist_expired}*` : ""}`,
								x.note
									? `${e.Lock} *${lang.warn_label_note}* : ${x.note}`
									: null,
								`-# ${lang.utils_label_by} <@${x.authorID}> · <t:${at}:D> · <t:${at}:R>`
							]
								.filter(Boolean)
								.join("\n");
						}),
					footer: pageLabel(lang, page, pages),
					signature
				})
		});
	}
};
