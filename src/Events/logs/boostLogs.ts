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
	EmbedBuilder,
	Client,
	GuildMember,
	BaseGuildTextChannel
} from "discord.js";

import { BotEvent } from "../../../types/event.js";

export const event: BotEvent = {
	name: "guildMemberUpdate",
	run: async (
		client: Client,
		oldMember: GuildMember,
		newMember: GuildMember
	) => {
		const MAX_RECENT_BOOST_DELAY_MS = 10 * 60 * 1000;
		const oldPremiumSince = oldMember.partial
			? (oldMember.premiumSinceTimestamp ?? null)
			: (oldMember.premiumSince?.getTime() ?? null);
		const newPremiumSince = newMember.partial
			? (newMember.premiumSinceTimestamp ?? null)
			: (newMember.premiumSince?.getTime() ?? null);
		const isRecentBoost =
			newPremiumSince !== null &&
			Date.now() - newPremiumSince <= MAX_RECENT_BOOST_DELAY_MS;

		if (oldPremiumSince === newPremiumSince) return;

		const data = await client.func.getLanguageData(newMember.guild.id);

		if (!newMember.guild.roles.premiumSubscriberRole) return;
		const Msgchannel = newMember.guild.channels.cache.get(
			(await client.db.get(
				`${newMember.guild.id}.GUILD.SERVER_LOGS.boosts`
			)) as string
		);

		if (!Msgchannel) return;

		const embed = new EmbedBuilder()
			.setColor("#a27cec")
			.setAuthor({
				name: newMember?.user.username,
				iconURL: newMember?.displayAvatarURL({
					extension: "png",
					forceStatic: false,
					size: 512
				})
			})
			.setTimestamp();

		if (!oldPremiumSince && newPremiumSince && isRecentBoost) {
			embed.setDescription(
				data.event_boostlog_add
					.replace("${newMember.user.id}", newMember.user.id)
					.replace(
						"${newMember.guild.premiumSubscriptionCount}",
						newMember.guild.premiumSubscriptionCount?.toString()!
					)
			);

			(Msgchannel as BaseGuildTextChannel)
				.send({ embeds: [embed] })
				.catch(() => {});
			return;
		}
		if (oldPremiumSince && !newPremiumSince) {
			embed.setDescription(
				data.event_boostlog_sub
					.replace("${newMember.user.id}", newMember.user.id)
					.replace(
						"${newMember.guild.premiumSubscriptionCount}",
						newMember.guild.premiumSubscriptionCount?.toString()!
					)
			);

			(Msgchannel as BaseGuildTextChannel)
				.send({ embeds: [embed] })
				.catch(() => {});
			return;
		}
	}
};
