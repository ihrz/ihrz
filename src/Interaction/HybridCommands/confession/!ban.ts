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
			!interaction.member ||
			!client.user ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const opts = client.func.method.options(interaction, args);
		const code = opts.string("code", 0, true).replace("#", "");
		const config = (await client.db.get(
			`${interaction.guildId}.GUILD.CONFESSION`
		)) as DatabaseStructure.ConfessionSchema | null;

		const confession = config?.ALL_CONFESSIONS?.find(
			(entry) => entry.code === code
		);

		if (!confession) {
			await client.func.method.interactionSend(interaction, {
				content: lang.confession_not_found.replace("${code}", code)
			});
			return;
		}

		if (!confession.userId) {
			await client.func.method.interactionSend(interaction, {
				content: lang.confession_ban_author_expired
			});
			return;
		}

		if (config?.banned?.some((ban) => ban.userId === confession.userId)) {
			await client.func.method.interactionSend(interaction, {
				content: lang.confession_ban_already.replace("${code}", code)
			});
			return;
		}

		await client.db.push(`${interaction.guildId}.GUILD.CONFESSION.banned`, {
			userId: confession.userId,
			code,
			moderatorId: interaction.member.user.id,
			timestamp: Date.now()
		} satisfies DatabaseStructure.ConfessionBan);

		await client.func.method.interactionSend(interaction, {
			content: lang.confession_ban_command_work.replace("${code}", code)
		});

		await client.func.ihorizon_logs(interaction, {
			title: lang.confession_ban_log_embed_title,
			description: lang.confession_ban_log_embed_desc
				.replace("${author}", interaction.member.user.toString())
				.replace("${code}", code)
		});

		return;
	}
};
