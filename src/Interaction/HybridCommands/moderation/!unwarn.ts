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

import { SubCommand } from "../../../../types/command.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	sendCard
} from "../../../core/modules/uiCard.js";
import {
	removeWarn,
	sendUnwarnLog
} from "../../../core/modules/moderationOps.js";

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
		const warnID = opts.longString("warn-id", 1)!;

		const result = member
			? await removeWarn(interaction.guild, member.id, warnID)
			: ({ ok: false, code: "no_warns" } as const);

		if (!result.ok && result.code === "no_warns") {
			await client.func.method.interactionSend(interaction, {
				content: lang.unwarn_cannot_found
					.replace("${emoji_No}", client.iHorizon_Emojis.No)
					.replace("${member}", member?.toString()!)
			});
			return;
		}

		if (!result.ok) {
			await client.func.method.interactionSend(interaction, {
				content: lang.unwarn_cannot_found_id
					.replace("${emoji_No}", client.iHorizon_Emojis.No)
					.replace("${member}", interaction.member?.toString()!)
			});
			return;
		}
		const removedWarn = result.removed;

		const e = client.iHorizon_Emojis;
		const warnedAt = Math.floor(removedWarn.timestamp / 1000);
		const resultCard = (signature: string | null) =>
			buildCard({
				accent: ACCENT.success,
				emoji: e.Yes,
				title: lang.unwarn_card_title,
				thumbnail: member?.displayAvatarURL({ size: 128 }),
				fields: [
					{
						emoji: e.Ticket_User,
						label: lang.utils_label_member,
						value: member ? `${member} (\`${member.id}\`)` : ""
					},
					{
						emoji: e.Security,
						label: lang.mod_label_moderator,
						value: interaction.member!.toString()
					},
					{
						emoji: e.Warn,
						label: lang.mod_label_warn_id,
						value: `\`${removedWarn.id}\``
					},
					{
						emoji: e.Paper,
						label: lang.var_reason,
						value: removedWarn.reason
					},
					{
						emoji: e.Schedule,
						label: lang.utils_label_by,
						value: `<@${removedWarn.authorID}> · <t:${warnedAt}:D>`
					}
				],
				signature
			});

		await sendCard(
			client,
			interaction,
			resultCard(await botSignature(client, interaction.guildId))
		);

		await sendUnwarnLog(
			interaction.guild,
			interaction.member.toString(),
			member?.toString()!,
			removedWarn,
			lang
		);
	}
};
