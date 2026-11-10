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
	Message
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";

import { SubCommand } from "../../../../types/command.js";
import { notice, sendCard } from "../../../core/modules/uiCard.js";
import { checkRoleChange } from "../../../core/modules/moderationOps.js";

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
		const user = opts.member("user", 0)! as GuildMember;
		const role = opts.role("role", 1);
		const author = interaction.member as GuildMember;

		if (!user) {
			await client.func.method.interactionSend(interaction, {
				content: lang.ban_dont_found_member
			});
			return;
		}

		const check = role
			? await checkRoleChange(author, user, role, true)
			: null;

		if (check && !check.ok) {
			const e = client.iHorizon_Emojis;
			const content =
				check.code === "role_refused"
					? `${e.Stop} ${client.func.permissonsCalculator.getRefusedRoleReason(role!, author, lang)}`
					: {
							not_whitelisted: lang.utils_addrole_not_wl.replace(
								"${emoji_No}",
								e.No
							),
							bot_not_admin: lang.backup_i_dont_have_permission,
							target_above_author:
								lang.utils_addrole_highter_or_egal_roles_msg.replace(
									"${emoji_Stop}",
									e.Stop
								),
							admin_role: lang.utils_addrole_cant_level,
							role_above_bot: lang.utils_addrole_try2brain
						}[check.code];
			await client.func.method.interactionSend(interaction, { content });
			return;
		}

		await user.roles.add(role?.id!, `[AddRole] Author: ${author.id}`);

		await sendCard(
			client,
			interaction,
			notice(
				"success",
				`${client.iHorizon_Emojis.Yes} ${lang.utils_addrole_command_ok
					.replace("${author}", author.toString())
					.replace("${role}", role?.toString()!)
					.replace("${user}", user.toString())}`
			)
		);
	}
};
