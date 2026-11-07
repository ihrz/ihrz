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

import { DatabaseStructure } from "../../../../types/database_structure.js";

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
		const member = opts.member("member", 0) as GuildMember | null;

		const allWarns: DatabaseStructure.WarnsData[] | null =
			await client.db.get(
				`${interaction.guildId}.USER.${member?.id}.WARNS`
			);

		if (!allWarns || allWarns.length === 0) {
			await client.func.method.interactionSend(interaction, {
				content: lang.warnlist_no_data
					.replace("${emoji_No}", client.iHorizon_Emojis.No)
					.replace("${member}", member?.toString()!)
			});
			return;
		}

		// delete all warns
		await client.db.delete(
			`${interaction.guildId}.USER.${member?.id}.WARNS`
		);

		await client.func.method.interactionSend(interaction, {
			content: lang.clearwarn_command_ok
				.replace("${emoji_Yes}", client.iHorizon_Emojis.Yes)
				.replace("${member}", member?.toString()!)
				.replace("${allWarnCount}", allWarns.length.toString())
				.replace("${author}", interaction.member.toString())
		});

		return;
	}
};
