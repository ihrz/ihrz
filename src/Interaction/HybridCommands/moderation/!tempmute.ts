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
import { tempmuteMember } from "../../../core/modules/moderationOps.js";

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
		const tomute = opts.member("user", 0) as GuildMember | null;
		const mutetime = opts.string("time", 1) as string | null;
		const reason = opts.longString("reason", 2);

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

		const result = await tempmuteMember(
			interaction.member as GuildMember,
			tomute,
			mutetimeMS,
			mutetimeString,
			reason,
			lang
		);

		if (!result.ok) {
			const e = client.iHorizon_Emojis;
			const content = {
				bot_missing_permission:
					lang.tempmute_i_dont_have_permission.replace(
						"${emoji_No}",
						e.No
					),
				target_is_admin: lang.tempmute_tomute_is_admin.replace(
					"${emoji_No}",
					e.No
				),
				target_above_bot: lang.tempmute_tomute_highest_role_or_same
					.replace("${emoji_No}", e.No)
					.replace("${tomute}", tomute.toString()),
				target_above_author: lang.tempmute_cannot_mute_higher_role
					.replace("${emoji_No}", e.No)
					.replace("${tomute}", tomute.toString()),
				self: lang.tempmute_cannot_mute_yourself.replace(
					"${emoji_No}",
					e.No
				),
				already_muted: lang.tempmute_already_muted,
				failed: lang.tempmute_i_dont_have_permission
			}[result.code];
			await client.func.method.interactionSend(interaction, { content });
			return;
		}

		const mutedUntil = result.mutedUntil;

		let content = lang.tempmute_command_work
			.replace("${tomuteId}", tomute.id)
			.replace("${duration}", mutetimeString)
			.replace("${reason}", reason || lang.var_no_set);

		if (overflow) {
			content += lang.tempmute_tomute_max_time_passed.replace(
				"${emoji_VC_OpenChat}",
				client.iHorizon_Emojis.VC_OpenChat
			);
		}
		await client.func.method.interactionSend(interaction, content);

		if (mutetimeMS <= max_time_untill_not_warn) {
			setTimeout(async () => {
				// Only announce the natural end of this exact mute: a manual
				// unmute or a new timeout changes the stored end date.
				const current = await tomute.fetch(true).catch(() => null);
				if (
					current &&
					mutedUntil !== null &&
					current.communicationDisabledUntilTimestamp === mutedUntil
				) {
					await client.func.method.channelSend(interaction, {
						content: lang.tempmute_unmuted_by_time.replace(
							"${tomuteId}",
							tomute?.id!
						)
					});
				}
			}, mutetimeMS);
		}
	}
};
