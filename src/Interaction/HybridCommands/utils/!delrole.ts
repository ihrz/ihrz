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
	ActionRowBuilder,
	ApplicationCommandType,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
	GuildMember,
	GuildMemberRoleManager,
	Message,
	PermissionFlagsBits,
	PermissionsBitField,
} from 'discord.js'

import { LanguageData } from '../../../../types/languageData.js';

import { Command } from '../../../../types/command.js';

import { DatabaseStructure } from '../../../../types/database_structure.js';
import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {


		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		if (interaction instanceof ChatInputCommandInteraction) {
			var user = interaction.options.getMember("user")! as GuildMember;
			var role = interaction.options.getRole("role");
			var author = interaction.member as GuildMember;
		} else {

			var user = client.func.method.member(interaction, args!, 0)! as GuildMember;
			var role = client.func.method.role(interaction, args!, 1);
			var author = interaction.member as GuildMember;
		};

		let allowed_roles: DatabaseStructure.UtilsData["wlRoles"] = await client.db.get(`${interaction.guildId}.UTILS.wlRoles`);

		if (!allowed_roles?.includes(role?.id!)) {
			await client.func.method.interactionSend(interaction, {
				content: lang.utils_delrole_not_wl.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
			})
			return;
		};

		if (!user) {
			await client.func.method.interactionSend(interaction, {
				content: lang.ban_dont_found_member
			});
			return;
		};

		if (!interaction.guild.members.me?.permissions.has(PermissionsBitField.Flags.Administrator)) {
			await client.func.method.interactionSend(interaction, {
				content: lang.backup_i_dont_have_permission
			});
			return;
		};

		if ((interaction.member.roles as GuildMemberRoleManager).highest.position <= user.roles.highest.position && interaction.member.user.id !== user.id) {
			await client.func.method.interactionSend(interaction, {
				content: lang.utils_delrole_highter_or_egal_roles_msg.replace("${client.iHorizon_Emojis.icon.Stop_Logo}", client.iHorizon_Emojis.icon.Stop_Logo)
			});
			return;
		};

		await user.roles.remove(role?.id!, `[DelRole] Author: ${author.id}`);

		await client.func.method.interactionSend(interaction, {
			embeds: [
				new EmbedBuilder()
					.setDescription(lang.utils_delrole_command_ok
						.replace("${author.toString()}", author.toString())
						.replace("${role?.toString()}", role?.toString()!)
						.replace("${user.toString()}", user.toString())
					)
			]
		});
	},
};