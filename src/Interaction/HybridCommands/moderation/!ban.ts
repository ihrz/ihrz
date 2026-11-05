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
	GuildMemberRoleManager,
	Message,
	PermissionsBitField,
	User
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

		if (interaction instanceof ChatInputCommandInteraction) {
			var member = interaction.options.getUser("member")!;
			var reason = interaction.options.getString("reason");
		} else {
			var member = (await client.func.method.user(
				interaction,
				args!,
				0
			)) as User;
			var reason = client.func.method.longString(args!, 1);
		}

		if (!reason) {
			reason = lang.guildprofil_not_set_punishPub;
		}

		if (!member) {
			await client.func.method.interactionSend(interaction, {
				content: lang.ban_dont_found_member
			});
			return;
		}

		if (
			!interaction.guild.members.me?.permissions.has(
				PermissionsBitField.Flags.BanMembers
			)
		) {
			await client.func.method.interactionSend(interaction, {
				content: lang.ban_dont_have_perm_myself.replace(
					"${emoji_No}",
					client.iHorizon_Emojis.No
				)
			});
			return;
		}

		const guildMember = interaction.guild.members.cache.get(member.id);

		if (member.id === interaction.member.user.id) {
			await client.func.method.interactionSend(interaction, {
				content: lang.ban_try_to_ban_yourself.replace(
					"${emoji_No}",
					client.iHorizon_Emojis.No
				)
			});
			return;
		}

		if (guildMember) {
			if (
				(interaction.member.roles as GuildMemberRoleManager).highest
					.position <= guildMember.roles.highest.position &&
				interaction.guild.ownerId !== interaction.member.user.id
			) {
				await client.func.method.interactionSend(interaction, {
					content: lang.ban_attempt_ban_higter_member.replace(
						"${emoji_Stop}",
						client.iHorizon_Emojis.Stop
					)
				});
				return;
			}

			if (!guildMember.bannable) {
				await client.func.method.interactionSend(interaction, {
					content: lang.ban_cant_ban_member.replace(
						"${emoji_No}",
						client.iHorizon_Emojis.No
					)
				});
				return;
			}
		}

		member
			.send({
				content: lang.ban_message_to_the_banned_member
					.replace("${guildName}", interaction.guild.name)
					.replace("${reason}", reason)
			})
			.catch(() => false)
			.then(() => false);

		interaction.guild?.bans
			.create(member?.id!, {
				reason: `Banned by: ${(interaction.member?.user as User).globalName || interaction.member?.user.username} | Reason: ${reason}`
			})
			.then(async () => {
				const e = client.iHorizon_Emojis;
				await sendCard(
					client,
					interaction,
					buildCard({
						accent: ACCENT.danger,
						emoji: e.Ban_Hammer,
						title: lang.ban_card_title,
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
								value: interaction.member!.toString()
							},
							{
								emoji: e.Paper,
								label: lang.var_reason,
								value: reason || lang.var_no_set
							}
						],
						signature: await botSignature(
							client,
							interaction.guildId
						)
					})
				).catch(() => {});

				await client.func.ihorizon_logs(interaction, {
					title: lang.ban_logs_embed_title,
					description: lang.ban_logs_embed_description
						.replaceAll("${memberId}", member.id)
						.replaceAll("${authorId}", interaction.member?.user.id!)
				});
			})
			.catch(() => {
				return client.func.method.interactionSend(interaction, {
					content: lang.setrankroles_command_error.replace(
						"${emoji_No}",
						client.iHorizon_Emojis.No
					)
				});
			});
	}
};
