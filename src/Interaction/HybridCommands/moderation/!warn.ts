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
	Client,
	ChatInputCommandInteraction,
	GuildMember,
	Message
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";

import { SubCommand } from "../../../../types/command.js";
import { sendCard } from "../../../core/modules/uiCard.js";
import {
	issueWarn,
	warnCard,
	warnRefusal
} from "../../../core/modules/warnSystem.js";

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
		const reason = opts.longString("reason", 1)!;
		// Slash only: in a prefix command the reason takes the rest of the message.
		const note = client.func.method.isSlash(interaction)
			? interaction.options.getString("note")
			: null;
		const author = interaction.member as GuildMember;
		const e = client.iHorizon_Emojis;

		if (!member) {
			await client.func.method.interactionSend(interaction, {
				content: lang.ban_dont_found_member
			});
			return;
		}
		// A warn can sanction automatically: the same guards as a sanction.
		const code = warnRefusal(author, member);
		const refusal = code
			? {
					self: lang.warn_err_self,
					bot: lang.warn_err_bot,
					owner: lang.warn_err_owner,
					above: lang.warn_err_above
				}[code]
			: null;
		if (refusal) {
			await client.func.method.interactionSend(interaction, {
				content: refusal.replace("${emoji_No}", e.No)
			});
			return;
		}

		const issued = await issueWarn(author, member, reason, lang, note);
		await sendCard(
			client,
			interaction,
			await warnCard(author, member, issued, lang)
		);
	}
};
