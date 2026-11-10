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
import { banUser } from "../../../core/modules/moderationOps.js";

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
		const member = (await opts.user("member", 0)) as User;
		let reason = opts.longString("reason", 1);

		if (!reason) {
			reason = lang.guildprofil_not_set_punishPub;
		}

		if (!member) {
			await client.func.method.interactionSend(interaction, {
				content: lang.ban_dont_found_member
			});
			return;
		}

		const result = await banUser(
			interaction.member as GuildMember,
			member,
			reason,
			lang
		);

		if (!result.ok) {
			const e = client.iHorizon_Emojis;
			const content = {
				bot_missing_permission: lang.ban_dont_have_perm_myself.replace(
					"${emoji_No}",
					e.No
				),
				self: lang.ban_try_to_ban_yourself.replace("${emoji_No}", e.No),
				target_above_author: lang.ban_attempt_ban_higter_member.replace(
					"${emoji_Stop}",
					e.Stop
				),
				not_bannable: lang.ban_cant_ban_member.replace(
					"${emoji_No}",
					e.No
				),
				failed: lang.setrankroles_command_error.replace(
					"${emoji_No}",
					e.No
				)
			}[result.code];
			await client.func.method.interactionSend(interaction, { content });
			return;
		}

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
				signature: await botSignature(client, interaction.guildId)
			})
		).catch(() => {});
	}
};
