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

import { Client, GuildMember } from "discord.js";

import { BotEvent } from "../../../types/event.js";
import { sendLogCard } from "../../core/modules/logCard.js";
import { boostChange } from "../../core/modules/boostMessage.js";

export const event: BotEvent = {
	name: "guildMemberUpdate",
	run: async (
		client: Client,
		oldMember: GuildMember,
		newMember: GuildMember
	) => {
		const change = boostChange(oldMember, newMember);
		if (!change) return;

		const data = await client.func.getLanguageData(newMember.guild.id);

		if (!newMember.guild.roles.premiumSubscriberRole) return;
		const Msgchannel = newMember.guild.channels.cache.get(
			(await client.db.get(
				`${newMember.guild.id}.GUILD.SERVER_LOGS.boosts`
			)) as string
		);

		if (!Msgchannel) return;

		const card = {
			kind: "boost" as const,
			emoji: client.iHorizon_Emojis.Boost_Gem,
			thumbnail: newMember.displayAvatarURL({
				extension: "png",
				forceStatic: false,
				size: 512
			})
		};
		const description = (text: string) =>
			text
				.replace("${newMemberUserId}", newMember.user.id)
				.replace(
					"${boostCount}",
					newMember.guild.premiumSubscriptionCount?.toString()!
				);

		if (change === "boost") {
			await sendLogCard(Msgchannel, {
				...card,
				title: data.logs_boost_add_title,
				description: description(data.event_boostlog_add)
			});
			return;
		}
		if (change === "unboost") {
			await sendLogCard(Msgchannel, {
				...card,
				title: data.logs_boost_remove_title,
				description: description(data.event_boostlog_sub)
			});
			return;
		}
	}
};
