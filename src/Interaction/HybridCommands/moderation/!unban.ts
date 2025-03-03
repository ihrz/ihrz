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
	BaseGuildTextChannel,
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
	InteractionEditReplyOptions,
	Message,
	MessagePayload,
	MessageReplyOptions,
	PermissionsBitField,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import logger from '../../../core/logger.js';
import { Command } from '../../../../types/command.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		if (!interaction.guild.members.me?.permissions.has([PermissionsBitField.Flags.BanMembers])) {
			await client.func.method.interactionSend(interaction, {
				content: lang.unban_bot_dont_have_permission.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
			})
			return;
		};

		if (interaction instanceof ChatInputCommandInteraction) {
			var userID = interaction.options.getString('userid');
			var reason = interaction.options.getString('reason');
		} else {

			var userID = client.func.method.string(args!, 0);
			var reason = client.func.method.longString(args!, 1);
		};

		if (!reason) reason = lang.unban_reason;

		await interaction.guild.bans.fetch()
			.then(async (bans) => {
				if (bans.size == 0) {
					await client.func.method.interactionSend(interaction, {
						content: lang.unban_there_is_nobody_banned.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
					});
					return;
				}
				let bannedID = bans.find(ban => ban.user.id == userID);
				if (!bannedID) {
					await client.func.method.interactionSend(interaction, {
						content: lang.unban_the_member_is_not_banned.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
					});
					return;
				};

				await interaction.guild?.bans.remove(userID as string, reason as string).catch(() => { });
				await client.func.method.interactionSend(interaction, {
					content: lang.unban_is_now_unbanned
						.replace(/\${userID}/g, userID as string)
				});
			})
			.catch((err: string) => logger.err(err));

		await client.func.ihorizon_logs(interaction, {
			title: lang.unban_logs_embed_title,
			description: lang.unban_logs_embed_description
				.replace(/\${userID}/g, userID as string)
				.replace(/\${interaction\.user\.id}/g, interaction.member.user.id)
		});
	},
};
