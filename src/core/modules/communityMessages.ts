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

import { Client, ContainerBuilder, Message, User } from "discord.js";

import { LanguageData } from "../../../types/languageData.js";
import { ACCENT, botSignature, buildCard } from "./uiCard.js";

/** `{guildId}.GUILD.FUN.states`: "off" disables the fun commands (/poll…). */
export async function isFunDisabled(
	client: Client,
	guildId: string | null | undefined
): Promise<boolean> {
	return (await client.db.get(`${guildId}.GUILD.FUN.states`)) === "off";
}

/** The `/fun interaction poll` card. */
export async function buildPollCard(
	client: Client,
	lang: LanguageData,
	guildId: string | null | undefined,
	author: User,
	question: string
): Promise<ContainerBuilder> {
	return buildCard({
		accent: ACCENT.info,
		emoji: client.iHorizon_Emojis.Thinking,
		title: lang.poll_card_title.replace(
			"${author}",
			author.globalName || author.username
		),
		description: `**${question}**`,
		blocks: [
			lang.poll_card_vote
				.replace("${yes}", client.iHorizon_Emojis.Yes)
				.replace("${no}", client.iHorizon_Emojis.No)
		],
		images: ["https://www.ihorizon.org/assets/img/poll_embed_image.gif"],
		signature: await botSignature(client, guildId)
	});
}

/** The reactions are the votes; they work on a Components V2 message too. */
export async function addPollVotes(
	client: Client,
	message: Message
): Promise<void> {
	await message.react(client.iHorizon_Emojis.Yes);
	await message.react(client.iHorizon_Emojis.No);
}

/** What `/say` posts: quoted text, then who asked. Nobody is pinged. */
export function sayPayload(lang: LanguageData, text: string, author: User) {
	return {
		content:
			"> " +
			`${text}${lang.say_footer_msg.replace("${author}", author.toString())}`,
		allowedMentions: { roles: [], users: [], repliedUser: false }
	};
}
