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
import { SubCommand } from "../../../../types/command.js";
import { unmuteAll } from "../../../core/modules/moderationOps.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData
	) => {
		if (
			!client.user ||
			!interaction.member ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const result = await unmuteAll(interaction.member as GuildMember, lang);

		if (!result.ok) {
			await client.func.method.interactionSend(interaction, {
				content:
					result.code === "bot_missing_permission"
						? lang.unmute_i_dont_have_permission.replace(
								"${emoji_No}",
								client.iHorizon_Emojis.No
							)
						: lang.unmuteall_no_muted_members
			});
			return;
		}

		await client.func.method.interactionSend(interaction, {
			content: lang.unmuteall_command_work
				.replace("${unmuted}", result.unmuted.toString())
				.replace("${total}", result.total.toString())
		});
	}
};
