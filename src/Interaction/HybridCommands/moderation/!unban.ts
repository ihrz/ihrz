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

import { LanguageData } from "../../../../types/languageData.js";
import { unbanUser } from "../../../core/modules/moderationOps.js";

import { SubCommand } from "../../../../types/command.js";

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
		const userID = opts.string("userid", 0) as string;
		let reason = opts.longString("reason", 1);

		if (!reason) reason = lang.unban_reason;

		const result = await unbanUser(
			interaction.member as GuildMember,
			userID,
			reason,
			lang
		);

		if (!result.ok) {
			await client.func.method.interactionSend(interaction, {
				content: (result.code === "bot_missing_permission"
					? lang.unban_bot_dont_have_permission
					: lang.unban_the_member_is_not_banned
				).replace("${emoji_No}", client.iHorizon_Emojis.No)
			});
			return;
		}

		await client.func.method.interactionSend(interaction, {
			content: lang.unban_is_now_unbanned.replaceAll("${userID}", userID)
		});
	}
};
