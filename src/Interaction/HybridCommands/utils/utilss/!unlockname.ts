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

		let targetMember: GuildMember | null;

		if (interaction instanceof ChatInputCommandInteraction) {
			targetMember = interaction.options.getMember(
				"member"
			) as GuildMember | null;
		} else {
			targetMember = client.func.method.member(
				interaction,
				args!,
				0
			) as GuildMember | null;
		}

		if (!targetMember) {
			await client.func.method.interactionSend(interaction, {
				content: lang.util_lockname_not_in_guild.replace(
					"${client.iHorizon_Emojis.No}",
					client.iHorizon_Emojis.No
				)
			});
			return;
		}

		const lockedNameData = await client.db.get(
			`${interaction.guildId}.LOCKNAME.${targetMember.id}`
		);

		if (!lockedNameData) {
			await client.func.method.interactionSend(interaction, {
				content: lang.util_unlockname_not_locked.replace(
					"${client.iHorizon_Emojis.No}",
					client.iHorizon_Emojis.No
				)
			});
			return;
		}

		await client.db.delete(
			`${interaction.guildId}.LOCKNAME.${targetMember.id}`
		);

		// Clear the custom nickname: back to the user's global display name.
		if (targetMember.manageable && targetMember.nickname) {
			await targetMember.edit({ nick: null }).catch(() => {});
		}

		await client.func.ihorizon_logs(interaction, {
			title: lang.util_lockname_logs_embed_title,
			description: lang.util_unlockname_logs_embed_description
				.replace("${interaction.user.id}", interaction.member.user.id)
				.replace("${member.id}", targetMember.id)
		});

		await client.func.method.interactionSend(interaction, {
			content: lang.util_unlockname_success
				.replace(
					"${client.iHorizon_Emojis.Yes}",
					client.iHorizon_Emojis.Yes
				)
				.replace("${member.toString()}", targetMember.toString())
		});

		return;
	}
};
