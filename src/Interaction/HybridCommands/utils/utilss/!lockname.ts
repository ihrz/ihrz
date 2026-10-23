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
		let desiredNickname: string | null;

		if (interaction instanceof ChatInputCommandInteraction) {
			targetMember = interaction.options.getMember(
				"member"
			) as GuildMember | null;
			desiredNickname = interaction.options.getString("nickname");
		} else {
			targetMember = client.func.method.member(
				interaction,
				args!,
				0
			) as GuildMember | null;
			desiredNickname = client.func.method.longString(args!, 1) || null;
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

		if (!targetMember.manageable) {
			await client.func.method.interactionSend(interaction, {
				content: lang.util_lockname_not_manageable.replace(
					"${client.iHorizon_Emojis.No}",
					client.iHorizon_Emojis.No
				)
			});
			return;
		}

		if (
			await client.db.get(
				`${interaction.guildId}.LOCKNAME.${targetMember.id}`
			)
		) {
			await client.func.method.interactionSend(interaction, {
				content: lang.util_lockname_already_locked.replace(
					"${client.iHorizon_Emojis.No}",
					client.iHorizon_Emojis.No
				)
			});
			return;
		}

		const lockedNick = desiredNickname
			? desiredNickname.trim().substring(0, 32)
			: (targetMember.nickname ?? null);

		if (lockedNick && lockedNick !== targetMember.nickname) {
			try {
				await targetMember.edit({ nick: lockedNick });
			} catch {
				await client.func.method.interactionSend(interaction, {
					content: lang.util_lockname_not_manageable.replace(
						"${client.iHorizon_Emojis.No}",
						client.iHorizon_Emojis.No
					)
				});
				return;
			}
		}

		await client.db.set(
			`${interaction.guildId}.LOCKNAME.${targetMember.id}`,
			{
				nick: lockedNick,
				lockedBy: interaction.member.user.id,
				lockedAt: Date.now()
			}
		);

		await client.func.ihorizon_logs(interaction, {
			title: lang.util_lockname_logs_embed_title,
			description: lang.util_lockname_logs_embed_description
				.replace("${interaction.user.id}", interaction.member.user.id)
				.replace("${member.id}", targetMember.id)
		});

		await client.func.method.interactionSend(
			interaction,
			lockedNick
				? lang.util_lockname_success
						.replace(
							"${client.iHorizon_Emojis.Yes}",
							client.iHorizon_Emojis.Yes
						)
						.replace(
							"${member.toString()}",
							targetMember.toString()
						)
						.replace("${nick}", lockedNick)
				: lang.util_lockname_success_reset
						.replace(
							"${client.iHorizon_Emojis.Yes}",
							client.iHorizon_Emojis.Yes
						)
						.replace(
							"${member.toString()}",
							targetMember.toString()
						)
		);

		return;
	}
};
