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
	PermissionFlagsBits,
	PermissionsBitField
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";
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

		if (interaction instanceof ChatInputCommandInteraction) {
			var tomute = interaction.options.getMember(
				"user"
			) as GuildMember | null;
			var mutetime = interaction.options.getString("time");
			var reason = interaction.options.getString("reason");
		} else {
			var tomute = client.func.method.member(
				interaction,
				args!,
				0
			) as GuildMember | null;
			var mutetime = client.func.method.string(args!, 1) as string | null;
			var reason = client.func.method.longString(args!, 2);
		}

		if (!mutetime || !tomute || !mutetime) {
			return;
		}

		let mutetimeMS = client.timeCalculator.to_ms(mutetime);
		const max_time = client.timeCalculator.to_ms("4weeks");
		const max_time_untill_not_warn = client.timeCalculator.to_ms("1weeks");

		let overflow = false;

		if (mutetimeMS > max_time) {
			mutetimeMS = max_time;
			overflow = true;
		}

		if (!mutetimeMS) {
			await client.func.method.interactionSend(interaction, {
				content: lang.too_new_account_invalid_time_on_enable
			});
			return;
		}

		const mutetimeString = client.timeCalculator.to_beautiful_string(
			mutetime,
			lang
		);

		if (
			!interaction.guild.members.me?.permissions.has([
				PermissionsBitField.Flags.ManageMessages,
				PermissionsBitField.Flags.MuteMembers,
				PermissionsBitField.Flags.ViewAuditLog,
				PermissionsBitField.Flags.ManageGuild
			])
		) {
			await client.func.method.interactionSend(interaction, {
				content: lang.tempmute_i_dont_have_permission.replace(
					"${client.iHorizon_Emojis.No}",
					client.iHorizon_Emojis.No
				)
			});
			return;
		}

		if (tomute.permissions.has(PermissionFlagsBits.Administrator)) {
			await client.func.method.interactionSend(interaction, {
				content: lang.tempmute_tomute_is_admin.replace(
					"${client.iHorizon_Emojis.No}",
					client.iHorizon_Emojis.No
				)
			});
			return;
		}

		if (
			tomute.roles.highest.position >=
				interaction.guild.members.me.roles.highest.position &&
			interaction.guild.ownerId !== interaction.member.user.id
		) {
			await client.func.method.interactionSend(interaction, {
				content: lang.tempmute_tomute_highest_role_or_same
					.replace(
						"${client.iHorizon_Emojis.No}",
						client.iHorizon_Emojis.No
					)
					.replace("${tomute.toString()}", tomute.toString())
			});
			return;
		}

		if (tomute.id === interaction.member.user.id) {
			await client.func.method.interactionSend(interaction, {
				content: lang.tempmute_cannot_mute_yourself.replace(
					"${client.iHorizon_Emojis.No}",
					client.iHorizon_Emojis.No
				)
			});
			return;
		}

		if (tomute.isCommunicationDisabled() === true) {
			await client.func.method.interactionSend(interaction, {
				content: lang.tempmute_already_muted
			});
			return;
		}

		await tomute
			.timeout(mutetimeMS, lang.tempmute_logs_embed_title)
			.catch(() => {});

		let content = lang.tempmute_command_work
			.replace("${tomute.id}", tomute.id)
			.replace("${ms(ms(mutetime))}", mutetimeString)
			.replace("${reason}", reason || lang.var_no_set);

		if (overflow) {
			content += lang.tempmute_tomute_max_time_passed.replace(
				"${client.iHorizon_Emojis.VC_OpenChat}",
				client.iHorizon_Emojis.VC_OpenChat
			);
		}
		await client.func.method.interactionSend(interaction, content);

		if (mutetimeMS <= max_time_untill_not_warn) {
			setTimeout(async () => {
				if (tomute?.isCommunicationDisabled() === true) {
					await client.func.method.channelSend(interaction, {
						content: lang.tempmute_unmuted_by_time.replace(
							"${tomute.id}",
							tomute?.id!
						)
					});
				}
			}, mutetimeMS);
		}

		await client.func.ihorizon_logs(interaction, {
			title: lang.tempmute_logs_embed_title,
			description: lang.tempmute_logs_embed_description
				.replace("${interaction.user.id}", interaction.member.user.id)
				.replace("${tomute.id}", tomute.id)
				.replace("${ms(ms(mutetime))}", mutetimeString)
				.replace("${reason}", reason || lang.var_no_set)
		});

		await client.func.method
			.warnMember(
				interaction.member!,
				tomute!,
				lang.tempmute_logs_embed_description
					.replace(
						"${interaction.user.id}",
						interaction.member.user.id
					)
					.replace("${tomute.id}", tomute.id)
					.replace("${ms(ms(mutetime))}", mutetimeString)
					.replace("${reason}", reason || lang.var_no_set),
				lang
			)
			.catch(() => {});
	}
};
