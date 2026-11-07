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
	ChannelType,
	ChatInputCommandInteraction,
	Client,
	GuildMember,
	Message,
	User
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";
import { SubCommand } from "../../../../types/command.js";
import {
	compareView,
	sendStatsCard,
	statsContext
} from "../../../core/modules/statsCommand.js";
import { notice, sendCard } from "../../../core/modules/uiCard.js";

// /stats compare user1 user2: two members side by side over 30 days.
export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		if (
			!client.user ||
			!interaction.member ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		let a: User | null;
		let b: User | null;
		const opts = client.func.method.options(interaction, args);
		a = (await opts.user("user1", 0)) ?? null;
		b = (await opts.user("user2", 1)) ?? null;
		if (!a || !b || a.id === b.id) {
			await sendCard(
				client,
				interaction,
				notice(
					"warning",
					`${client.iHorizon_Emojis.Warn} ${lang.stats_compare_same}`
				)
			);
			return;
		}

		const ctx = await statsContext(client, interaction, lang);
		const views = await compareView(ctx, a.id, b.id);
		if (!views) {
			await sendCard(
				client,
				interaction,
				notice(
					"info",
					`${client.iHorizon_Emojis.Stats} ${lang.stats_card_no_data}`
				)
			);
			return;
		}
		const name = (u: User) =>
			interaction.guild!.members.cache.get(u.id)?.displayName ??
			u.displayName;
		await sendStatsCard(ctx, {
			title: lang.stats_title_compare
				.replace("${a}", name(a))
				.replace("${b}", name(b)),
			emoji: client.iHorizon_Emojis.Stats,
			views
		});
	}
};
