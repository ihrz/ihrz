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

import { Client, ChatInputCommandInteraction, Message, Role } from "discord.js";

import logger from "../../../core/logger.js";
import { LanguageData } from "../../../../types/languageData.js";

import { SubCommand } from "../../../../types/command.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	notice,
	sendCard
} from "../../../core/modules/uiCard.js";

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
		const type = opts.string("action", 0);
		const argsid = opts.role("roles", 1) as Role | null;
		const nickname = opts.longString("part-of-nickname", 2);

		if (type === "on") {
			if (!argsid) {
				await client.func.method.interactionSend(interaction, {
					content: lang.setrankroles_not_roles_typed.replace(
						"${emoji_No}",
						client.iHorizon_Emojis.No
					)
				});
				return;
			}

			await client.func.ihorizon_logs(interaction, {
				title: lang.setrankroles_logs_embed_title_enable,
				description: lang.setrankroles_logs_embed_description_enable
					.replaceAll("${authorId}", interaction.member.user.id)
					.replaceAll("${argsid}", argsid.id)
			});

			try {
				const already = await client.db.get(
					`${interaction.guildId}.GUILD.RANK_ROLES.roles`
				);

				if (already === argsid.id) {
					await client.func.method.interactionSend(interaction, {
						content: lang.setrankroles_already_this_in_db.replace(
							"${emoji_No}",
							client.iHorizon_Emojis.No
						)
					});
					return;
				}

				if (nickname) {
					await client.db.set(
						`${interaction.guildId}.GUILD.RANK_ROLES.nicknames`,
						nickname
					);
				}

				await client.db.set(
					`${interaction.guildId}.GUILD.RANK_ROLES.roles`,
					argsid.id
				);

				const emojis = client.iHorizon_Emojis;
				await sendCard(
					client,
					interaction,
					buildCard({
						accent: argsid.color || ACCENT.success,
						emoji: emojis.Ticket_Role,
						title: lang.setmentionrole_card_title,
						description: lang.setmentionrole_card_desc,
						fields: [
							{
								emoji: emojis.Ticket_Role,
								label: lang.utils_label_role,
								value: argsid.toString()
							},
							!!nickname && {
								emoji: emojis.Nametag,
								label: lang.utils_label_name_filter,
								value: `\`${nickname}\``
							},
							{
								emoji: emojis.Crown,
								label: lang.utils_label_by,
								value: interaction.member.toString()
							}
						],
						blocks: [
							nickname && `-# ${lang.setmentionrole_card_note}`
						],
						signature: await botSignature(
							client,
							interaction.guildId
						)
					})
				);
				return;
			} catch (e) {
				logger.err(e);
				await client.func.method.interactionSend(interaction, {
					content: lang.setrankroles_command_error.replace(
						"${emoji_No}",
						client.iHorizon_Emojis.No
					)
				});
				return;
			}
		} else if (type == "off") {
			await client.func.ihorizon_logs(interaction, {
				title: lang.setrankroles_logs_embed_title_disable,
				description:
					lang.setrankroles_logs_embed_description_disable.replaceAll(
						"${authorId}",
						interaction.member.user.id
					)
			});

			try {
				await client.db.delete(
					`${interaction.guildId}.GUILD.RANK_ROLES`
				);

				await sendCard(
					client,
					interaction,
					notice(
						"success",
						`${client.iHorizon_Emojis.Yes} ${lang.setrankroles_command_work_disable.replaceAll(
							"${authorId}",
							interaction.member.user.id
						)}`
					)
				);
				return;
			} catch (e) {
				logger.err(e);
				await client.func.method.interactionSend(interaction, {
					content: lang.setrankroles_command_error.replace(
						"${emoji_No}",
						client.iHorizon_Emojis.No
					)
				});
				return;
			}
		}
	}
};
