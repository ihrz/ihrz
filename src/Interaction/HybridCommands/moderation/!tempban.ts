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
	Message,
	PermissionsBitField,
	User,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		if (interaction instanceof ChatInputCommandInteraction) {
			var userToBan = interaction.options.getUser("user");
			var banTime = interaction.options.getString("duration");
			var reason = interaction.options.getString("reason");
		} else {
			var userToBan = await client.func.method.user(interaction, args!, 0);
			var banTime = client.func.method.string(args!, 1);
			var reason = client.func.method.longString(args!, 2);
		};

		if (!banTime || !userToBan) { return; };

		let bantimeMS = client.timeCalculator.to_ms(banTime);
		const max_time = client.timeCalculator.to_ms("1year");
		let overflow = false;

		if (bantimeMS > max_time) {
			bantimeMS = max_time;
			overflow = true;
		}

		if (!bantimeMS) {
			await client.func.method.interactionSend(interaction, { content: lang.too_new_account_invalid_time_on_enable });
			return;
		}

		const bantimeString = client.timeCalculator.to_beautiful_string(banTime, lang);

		if (!interaction.guild.members.me?.permissions.has(
			[PermissionsBitField.Flags.BanMembers]
		)) {
			await client.func.method.interactionSend(interaction, {
				content: lang.tempban_i_dont_have_permission.replace("${client.iHorizon_Emojis.No}", client.iHorizon_Emojis.No)
			});
			return;
		};

		// Check if user is in the guild
		const memberToBan = await interaction.guild.members.fetch(userToBan.id).catch(() => null);

		if (memberToBan) {
			// User is in the guild, check role hierarchy
			if (memberToBan.roles.highest.position >= interaction.guild.members.me.roles.highest.position && interaction.guild.ownerId !== interaction.member.user.id) {
				await client.func.method.interactionSend(interaction, {
					content: lang.tempban_user_highest_role_or_same
						.replace("${client.iHorizon_Emojis.No}", client.iHorizon_Emojis.No)
						.replace("${user.toString()}", userToBan.toString())
				});
				return;
			}

			if (memberToBan.permissions.has(PermissionsBitField.Flags.Administrator)) {
				await client.func.method.interactionSend(interaction, {
					content: lang.tempban_user_is_admin.replace("${client.iHorizon_Emojis.No}", client.iHorizon_Emojis.No)
				});
				return;
			}
		}

		if (await client.tempbanManager.isAlreadyBanned(interaction.guild, userToBan) === true) {
			await client.func.method.interactionSend(interaction, { content: lang.tempban_already_banned });
			return;
		};

		const success = await client.tempbanManager.addban(interaction.guild, userToBan, bantimeMS, reason || undefined);

		if (!success) {
			await client.func.method.interactionSend(interaction, {
				content: lang.tempban_i_dont_have_permission.replace("${client.iHorizon_Emojis.No}", client.iHorizon_Emojis.No)
			});
			return;
		}

		let content = lang.tempban_command_work
			.replace("${user.id}", userToBan.id)
			.replace("${duration}", bantimeString)
			.replace("${reason}", reason || lang.var_no_set);

		if (overflow) {
			content += lang.tempban_max_time_passed.replace("${client.iHorizon_Emojis.VC_OpenChat}", client.iHorizon_Emojis.VC_OpenChat)
		}
		await client.func.method.interactionSend(interaction, content);

		await client.func.ihorizon_logs(interaction, {
			title: lang.tempban_logs_embed_title,
			description: lang.tempban_logs_embed_description
				.replace("${executor.id}", interaction.member.user.id)
				.replace("${user.id}", userToBan.id)
				.replace("${duration}", bantimeString)
				.replace("${reason}", reason || lang.var_no_set)
		});
	},
};