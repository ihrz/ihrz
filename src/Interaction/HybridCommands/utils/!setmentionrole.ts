/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import {
	Client,
	EmbedBuilder,
	PermissionsBitField,
	ApplicationCommandOptionType,
	ChatInputCommandInteraction,
	BaseGuildTextChannel,
	ApplicationCommandType,
	Message,
	MessagePayload,
	InteractionEditReplyOptions,
	MessageReplyOptions,
	Role
} from 'discord.js'

import { Command } from '../../../../types/command.js';
import logger from '../../../core/logger.js';
import { LanguageData } from '../../../../types/languageData.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {


		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		if (interaction instanceof ChatInputCommandInteraction) {
			var type = interaction.options.getString("action");
			var argsid = interaction.options.getRole("roles");
			var nickname = interaction.options.getString("part-of-nickname");
		} else {

			var type = client.func.method.string(args!, 0);
			var argsid = client.func.method.role(interaction, args!, 1) as Role | null;
			var nickname = client.func.method.longString(args!, 2);
		};

		if (type === "on") {
			if (!argsid) {
				await client.func.method.interactionSend(interaction, {
					content: lang.setrankroles_not_roles_typed.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
				});
				return;
			};

			await client.func.ihorizon_logs(interaction, {
				title: lang.setrankroles_logs_embed_title_enable,
				description: lang.setrankroles_logs_embed_description_enable
					.replace(/\${interaction\.user.id}/g, interaction.member.user.id)
					.replace(/\${argsid}/g, argsid.id)
			});

			try {
				let already = await client.db.get(`${interaction.guildId}.GUILD.RANK_ROLES.roles`);

				if (already === argsid.id) {
					await client.func.method.interactionSend(interaction, {
						content: lang.setrankroles_already_this_in_db.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
					});
					return;
				};

				let msg = '';

				if (nickname) {
					msg = lang.setrankroles_command_work_with_nicknames
						.replace('${argsid}', argsid.id)
						.replace('${nicknames}', nickname);
					msg += lang.setrankroles_command_work_with_nicknames_2

					await client.db.set(`${interaction.guildId}.GUILD.RANK_ROLES.nicknames`, nickname);
				} else {
					msg = lang.setrankroles_command_work.replace('${argsid}', argsid.id)
				}

				await client.db.set(`${interaction.guildId}.GUILD.RANK_ROLES.roles`, argsid.id);

				let e = new EmbedBuilder().setDescription(msg);

				await client.func.method.interactionSend(interaction, { embeds: [e] });
				return;

			} catch (e: any) {
				logger.err(e);
				await client.func.method.interactionSend(interaction, {
					content: lang.setrankroles_command_error.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
				});
				return;
			}
		} else if (type == "off") {
			await client.func.ihorizon_logs(interaction, {
				title: lang.setrankroles_logs_embed_title_disable,
				description: lang.setrankroles_logs_embed_description_disable
					.replace(/\${interaction\.user.id}/g, interaction.member.user.id)
			});

			try {
				await client.db.delete(`${interaction.guildId}.GUILD.RANK_ROLES`);

				await client.func.method.interactionSend(interaction, {
					content: lang.setrankroles_command_work_disable
						.replace(/\${interaction\.user.id}/g, interaction.member.user.id)
				});
				return;
			} catch (e: any) {
				logger.err(e)
				await client.func.method.interactionSend(interaction, {
					content: lang.setrankroles_command_error.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
				});
				return;
			}
		}
	},
};