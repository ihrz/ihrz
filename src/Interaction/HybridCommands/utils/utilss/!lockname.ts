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
	GuildMember,
	Message
} from "discord.js";

import { LanguageData } from "../../../../../types/languageData.js";
import { SubCommand } from "../../../../../types/command.js";
import { lockMemberName } from "../../../../core/modules/memberToolsManager.js";

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

		const opts = client.func.method.options(interaction, args);
		const targetMember = opts.member("member", 0) as GuildMember | null;
		const desiredNickname = opts.longString("nickname", 1);

		if (!targetMember) {
			await client.func.method.interactionSend(interaction, {
				content: lang.util_lockname_not_in_guild.replace(
					"${emoji_No}",
					client.iHorizon_Emojis.No
				)
			});
			return;
		}

		const result = await lockMemberName(
			client,
			interaction.guild,
			interaction.member as GuildMember,
			targetMember,
			desiredNickname
		);

		if (!result.ok) {
			await client.func.method.interactionSend(interaction, {
				content:
					result.reason === "hierarchy"
						? lang.moderation_target_higher_role.replace(
								"${member}",
								targetMember.toString()
							)
						: (result.reason === "already_locked"
								? lang.util_lockname_already_locked
								: lang.util_lockname_not_manageable
							).replace("${emoji_No}", client.iHorizon_Emojis.No)
			});
			return;
		}
		const lockedNick = result.nick;

		await client.func.ihorizon_logs(interaction, {
			title: lang.util_lockname_logs_embed_title,
			description: lang.util_lockname_logs_embed_description
				.replace("${authorId}", interaction.member.user.id)
				.replace("${memberId}", targetMember.id)
		});

		await client.func.method.interactionSend(
			interaction,
			lockedNick
				? lang.util_lockname_success
						.replace("${emoji_Yes}", client.iHorizon_Emojis.Yes)
						.replace("${member}", targetMember.toString())
						.replace("${nick}", lockedNick)
				: lang.util_lockname_success_reset
						.replace("${emoji_Yes}", client.iHorizon_Emojis.Yes)
						.replace("${member}", targetMember.toString())
		);

		return;
	}
};
