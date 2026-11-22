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
	Role
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	sendCard
} from "../../../core/modules/uiCard.js";
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

		const opts = client.func.method.options(interaction, args);
		const memberToAdd = opts.member("member", 0) as GuildMember | null;
		const roleToAdd = opts.role("role", 1) as Role | null;
		const roleTime = opts.string("time", 2);
		const reason = opts.longString("reason", 3);

		if (!roleTime || !memberToAdd || !roleToAdd) {
			return;
		}

		let roletimeMS = client.timeCalculator.to_ms(roleTime);
		const max_time = client.timeCalculator.to_ms("1year");
		let overflow = false;

		if (roletimeMS > max_time) {
			roletimeMS = max_time;
			overflow = true;
		}

		if (!roletimeMS) {
			await client.func.method.interactionSend(interaction, {
				content: lang.too_new_account_invalid_time_on_enable
			});
			return;
		}

		const roletimeString = client.timeCalculator.to_beautiful_string(
			roleTime,
			lang
		);

		if (
			!interaction.guild.members.me?.permissions.has([
				PermissionsBitField.Flags.ManageRoles
			])
		) {
			await client.func.method.interactionSend(interaction, {
				content: lang.temprole_i_dont_have_permission.replace(
					"${emoji_No}",
					client.iHorizon_Emojis.No
				)
			});
			return;
		}

		if (
			memberToAdd.roles.highest.position >=
				interaction.guild.members.me.roles.highest.position &&
			interaction.guild.ownerId !== interaction.member.user.id
		) {
			await client.func.method.interactionSend(interaction, {
				content: lang.temprole_tomute_highest_role_or_same
					.replace("${emoji_No}", client.iHorizon_Emojis.No)
					.replace("${tomute}", memberToAdd.toString())
			});
			return;
		}

		if (
			roleToAdd.position >=
				interaction.guild.members.me.roles.highest.position &&
			interaction.guild.ownerId !== interaction.member.user.id
		) {
			await client.func.method.interactionSend(interaction, {
				content: lang.temprole_i_dont_have_permission.replace(
					"${emoji_No}",
					client.iHorizon_Emojis.No
				)
			});
			return;
		}

		// Role and target are checked against the author too, not only the
		// bot: nobody gives a role they could not give themselves.
		const refusedReason =
			client.func.permissonsCalculator.getRefusedRoleReason(
				roleToAdd,
				interaction.member,
				lang
			);
		if (refusedReason) {
			await client.func.method.interactionSend(interaction, {
				content: `${client.iHorizon_Emojis.Stop} ${refusedReason}`
			});
			return;
		}

		if (
			interaction.guild.ownerId !== interaction.member.user.id &&
			memberToAdd.id !== interaction.member.user.id &&
			memberToAdd.roles.highest.position >=
				interaction.member.roles.highest.position
		) {
			await client.func.method.interactionSend(interaction, {
				content: lang.temprole_tomute_highest_role_or_same
					.replace("${emoji_No}", client.iHorizon_Emojis.No)
					.replace("${tomute}", memberToAdd.toString())
			});
			return;
		}

		if (
			(await client.temproleManager.isAlreadyWithThisRole(
				memberToAdd,
				roleToAdd
			)) === true
		) {
			await client.func.method.interactionSend(interaction, {
				content: lang.temprole_already_has_role
			});
			return;
		}

		await client.temproleManager.addrole(
			memberToAdd,
			roleToAdd,
			roletimeMS,
			reason!
		);

		const e = client.iHorizon_Emojis;
		await sendCard(
			client,
			interaction,
			buildCard({
				accent: ACCENT.success,
				emoji: e.Ticket_Role,
				title: lang.temprole_card_title,
				thumbnail: memberToAdd.displayAvatarURL({ size: 128 }),
				fields: [
					{
						emoji: e.Ticket_User,
						label: lang.utils_label_member,
						value: `${memberToAdd} (\`${memberToAdd.id}\`)`
					},
					{
						emoji: e.Ticket_Role,
						label: lang.utils_label_role,
						value: roleToAdd.toString()
					},
					{
						emoji: e.Security,
						label: lang.mod_label_moderator,
						value: interaction.member.toString()
					},
					{
						emoji: e.Timer,
						label: lang.mod_label_duration,
						value: roletimeString
					},
					{
						emoji: e.Schedule,
						label: lang.mod_label_ends,
						value: `<t:${Math.floor((Date.now() + roletimeMS) / 1000)}:R>`
					},
					{
						emoji: e.Paper,
						label: lang.var_reason,
						value: reason || lang.var_no_set
					}
				],
				blocks: [
					overflow
						? lang.temprole_tomute_max_time_passed.replace(
								"${emoji_VC_OpenChat}",
								e.VC_OpenChat
							)
						: null
				],
				signature: await botSignature(client, interaction.guildId)
			})
		);

		await client.func.ihorizon_logs(interaction, {
			title: lang.temprole_logs_embed_title,
			description: lang.temprole_logs_embed_description
				.replace("${authorId}", interaction.member.user.id)
				.replace("${tomuteId}", memberToAdd.id)
				.replace("${duration}", roletimeString)
				.replace("${reason}", reason || lang.var_no_set)
		});
	}
};
