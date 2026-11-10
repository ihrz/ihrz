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

import { ChatInputCommandInteraction, Client, Message } from "discord.js";
import { LanguageData } from "../../../../types/languageData.js";
import { SubCommand } from "../../../../types/command.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	sendCard
} from "../../../core/modules/uiCard.js";
import { getBanInfo } from "../../../core/modules/moderationOps.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		const opts = client.func.method.options(interaction, args);
		const user = await opts.user("user", 0);

		if (!user) {
			await client.func.method.interactionSend(interaction, {
				content: lang.baninfo_user_not_found
			});
			return;
		}

		const info = interaction.guild
			? await getBanInfo(interaction.guild, user.id)
			: null;

		if (!info) {
			await client.func.method.interactionSend(interaction, {
				content: lang.baninfo_not_banned
			});
			return;
		}

		const ban_info = info.ban;
		const e = client.iHorizon_Emojis;
		const bannedAt = info.bannedAt
			? Math.floor(info.bannedAt / 1000)
			: null;
		const executor = info.executor;

		await sendCard(
			client,
			interaction,
			buildCard({
				accent: ACCENT.danger,
				emoji: e.Ban_Hammer,
				title: lang.baninfo_card_title.replace(
					"${user}",
					user.displayName
				),
				thumbnail: user.displayAvatarURL({
					forceStatic: false,
					size: 256
				}),
				fields: [
					{
						emoji: e.Ticket_User,
						label: lang.utils_label_member,
						value: `${user} (\`${user.id}\`)`
					},
					{
						emoji: e.Schedule,
						label: lang.var_ban_date,
						value: bannedAt
							? `<t:${bannedAt}:D> · <t:${bannedAt}:R>`
							: lang.var_unknown
					},
					{
						emoji: e.Security,
						label: lang.var_banned_by,
						value: executor
							? `<@${executor.id}> (\`${executor.tag}\`)`
							: lang.var_unknown
					},
					{
						emoji: e.Paper,
						label: lang.var_reason,
						value: ban_info.reason || lang.blacklist_var_no_reason
					}
				],
				signature: await botSignature(client, interaction.guildId)
			})
		);
		return;
	}
};
