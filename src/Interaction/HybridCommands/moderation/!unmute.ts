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
import { unmuteMember } from "../../../core/modules/moderationOps.js";

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
		const tomute = opts.member("user", 0) as GuildMember | null;

		if (!tomute) return;

		const result = await unmuteMember(
			interaction.member as GuildMember,
			tomute,
			lang
		);

		if (!result.ok) {
			const e = client.iHorizon_Emojis;
			const content = {
				bot_missing_permission:
					lang.unmute_i_dont_have_permission.replace(
						"${emoji_No}",
						e.No
					),
				self: lang.unmute_attempt_mute_your_self.replace(
					"${emoji_No}",
					e.No
				),
				target_above_author: lang.moderation_target_higher_role.replace(
					"${member}",
					tomute.toString()
				),
				not_muted: lang.unmute_not_muted,
				failed: lang.setrankroles_command_error.replace(
					"${emoji_No}",
					e.No
				)
			}[result.code];
			await client.func.method.interactionSend(interaction, { content });
			return;
		}

		await client.func.method.interactionSend(interaction, {
			content: lang.unmute_command_work.replace("${tomuteId}", tomute.id)
		});
	}
};
