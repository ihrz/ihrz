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

import { ChatInputCommandInteraction, Client, Message } from "discord.js";

import { DatabaseStructure } from "../../../../types/database_structure.js";
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

		const based = (await client.db.get(
			`${interaction.guildId}.GUILD.SNIPE.${interaction.channel.id}`
		)) as DatabaseStructure.SnipeData[""];

		const message_content = based?.snipe;

		if (!based || !message_content) {
			await client.func.method.interactionSend(interaction, {
				content: lang.snipe_no_previous_message_deleted
			});
			return;
		}

		const e = client.iHorizon_Emojis;
		// The tag is stored as "username (id)": mention the author when we can.
		const tag = based.snipeUserInfoTag ?? "";
		const authorId = tag.match(/\((\d{15,25})\)$/)?.[1];
		const username = tag.replace(/\s*\(\d{15,25}\)$/, "");
		const sent = Math.floor(based.snipeTimestamp / 1000);

		await sendCard(
			client,
			interaction,
			buildCard({
				accent: ACCENT.neutral,
				emoji: e.Search,
				title: lang.snipe_card_title,
				thumbnail: based.snipeUserInfoPp,
				fields: [
					{
						emoji: e.Ticket_User,
						label: lang.snipe_label_author,
						value: authorId
							? `<@${authorId}> (\`${username}\`)`
							: `\`${tag}\``
					},
					{
						emoji: e.Schedule,
						label: lang.snipe_label_sent,
						value: based.snipeTimestamp
							? `<t:${sent}:f> (<t:${sent}:R>)`
							: ""
					}
				],
				blocks: [
					message_content
						.split("\n")
						.map((line) => `> ${line}`)
						.join("\n")
				],
				signature: await botSignature(client, interaction.guildId)
			})
		);
		return;
	}
};
