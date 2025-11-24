/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import {
	ChatInputCommandInteraction,
	Client,
	GuildMember,
	Message,
	PermissionsBitField,
	Role,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		if (interaction instanceof ChatInputCommandInteraction) {
			var memberToAdd = interaction.options.getMember("member") as GuildMember | null;
			var roleToAdd = interaction.options.getRole("role") as Role | null;
			var roleTime = interaction.options.getString("time");
			var reason = interaction.options.getString("reason");
		} else {
			var memberToAdd = client.func.method.member(interaction, args!, 0) as GuildMember | null;
			var roleToAdd = client.func.method.role(interaction, args!, 1) as Role | null;
			var roleTime = client.func.method.string(args!, 2);
			var reason = client.func.method.longString(args!, 3);
		};

		if (!roleTime || !memberToAdd || !roleToAdd) { return; };

		let roletimeMS = client.timeCalculator.to_ms(roleTime);
		const max_time = client.timeCalculator.to_ms("1year");
		let overflow = false;

		if (roletimeMS > max_time) {
			roletimeMS = max_time;
			overflow = true;
		}

		if (!roletimeMS) {
			await client.func.method.interactionSend(interaction, { content: lang.too_new_account_invalid_time_on_enable });
			return;
		}

		const roletimeString = client.timeCalculator.to_beautiful_string(roleTime, lang);

		if (!interaction.guild.members.me?.permissions.has(
			[PermissionsBitField.Flags.ManageRoles]
		)) {
			await client.func.method.interactionSend(interaction, {
				content: lang.temprole_i_dont_have_permission.replace("${client.iHorizon_Emojis.No}", client.iHorizon_Emojis.No)
			});
			return;
		};

		if (memberToAdd.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
			await client.func.method.interactionSend(interaction, {
				content: lang.temprole_tomute_highest_role_or_same
					.replace("${client.iHorizon_Emojis.No}", client.iHorizon_Emojis.No)
					.replace("${tomute.toString()}", memberToAdd.toString())
			});
			return;
		}

		if (roleToAdd.position >= interaction.guild.members.me.roles.highest.position) {
			await client.func.method.interactionSend(interaction, {
				content: lang.temprole_i_dont_have_permission.replace("${client.iHorizon_Emojis.No}", client.iHorizon_Emojis.No)
			});
			return;
		}

		if (await client.temproleManager.isAlreadyWithThisRole(memberToAdd, roleToAdd) === true) {
			await client.func.method.interactionSend(interaction, { content: lang.temprole_already_has_role });
			return;
		};

		await client.temproleManager.addrole(memberToAdd, roleToAdd, roletimeMS, reason!)

		let content = lang.temprole_command_work
			.replace("${tomute.id}", memberToAdd.id)
			.replace("${ms(ms(mutetime))}", roletimeString)
			.replace("${reason}", reason || lang.var_no_set);

		if (overflow) {
			content += lang.temprole_tomute_max_time_passed.replace("${client.iHorizon_Emojis.VC_OpenChat}", client.iHorizon_Emojis.VC_OpenChat)
		}
		await client.func.method.interactionSend(interaction, content);

		await client.func.ihorizon_logs(interaction, {
			title: lang.temprole_logs_embed_title,
			description: lang.temprole_logs_embed_description
				.replace("${interaction.user.id}", interaction.member.user.id)
				.replace("${tomute.id}", memberToAdd.id)
				.replace("${ms(ms(mutetime))}", roletimeString)
				.replace("${reason}", reason || lang.var_no_set)
		});
	},
};