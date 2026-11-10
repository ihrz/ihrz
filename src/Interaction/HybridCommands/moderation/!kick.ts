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
	GuildMemberRoleManager,
	Message,
	PermissionsBitField
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";

import { SubCommand } from "../../../../types/command.js";
import {
	ACCENT,
	botSignature,
	buildCard,
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
		const member = opts.member("member", 0) as GuildMember | null;
		let reason = opts.longString("reason", 1);

		if (!reason) {
			reason = lang.guildprofil_not_set_punishPub;
		}

		if (!member) return;

		if (
			!interaction.guild.members.me?.permissions.has(
				PermissionsBitField.Flags.KickMembers
			)
		) {
			await client.func.method.interactionSend(interaction, {
				content: lang.kick_dont_have_permission.replace(
					"${emoji_No}",
					client.iHorizon_Emojis.No
				)
			});
			return;
		}

		if (member.id === interaction.member.user.id) {
			await client.func.method.interactionSend(interaction, {
				content: lang.kick_attempt_kick_your_self.replace(
					"${emoji_No}",
					client.iHorizon_Emojis.No
				)
			});
			return;
		}

		if (
			(interaction.member.roles as GuildMemberRoleManager).highest
				.position <= member.roles.highest.position &&
			interaction.guild.ownerId !== interaction.member.user.id
		) {
			await client.func.method.interactionSend(interaction, {
				content: lang.kick_attempt_kick_higter_member.replace(
					"${emoji_Stop}",
					client.iHorizon_Emojis.Stop
				)
			});
			return;
		}

		member
			.send({
				content: lang.kick_message_to_the_banned_member
					.replaceAll("${guildName}", interaction.guild.name)
					.replaceAll(
						"${authorUsername}",
						interaction.member.user.username
					)
			})
			.catch(() => {});

		const kicked = await member
			.kick(
				`Kicked by: ${interaction.member.user.username} | Reason: ${reason}`
			)
			.then(() => true)
			.catch(() => false);
		if (!kicked) {
			await client.func.method.interactionSend(interaction, {
				content: lang.setrankroles_command_error.replace(
					"${emoji_No}",
					client.iHorizon_Emojis.No
				)
			});
			return;
		}

		const e = client.iHorizon_Emojis;
		await sendCard(
			client,
			interaction,
			buildCard({
				accent: ACCENT.danger,
				emoji: e.Ban_Hammer,
				title: lang.kick_card_title,
				thumbnail: member.displayAvatarURL({ size: 128 }),
				fields: [
					{
						emoji: e.Ticket_User,
						label: lang.utils_label_member,
						value: `${member} (\`${member.id}\`)`
					},
					{
						emoji: e.Security,
						label: lang.mod_label_moderator,
						value: interaction.member.toString()
					},
					{
						emoji: e.Paper,
						label: lang.var_reason,
						value: reason || lang.var_no_set
					}
				],
				signature: await botSignature(client, interaction.guildId)
			})
		);

		await client.func.ihorizon_logs(interaction, {
			title: lang.kick_logs_embed_title,
			description: lang.kick_logs_embed_description
				.replaceAll("${member}", member.user.toString())
				.replaceAll("${authorId}", interaction.member.user.id)
		});
	}
};
