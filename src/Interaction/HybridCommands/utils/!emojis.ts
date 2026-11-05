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

import { Client, ChatInputCommandInteraction, Message } from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";

import { SubCommand } from "../../../../types/command.js";
import { sleep } from "bun";
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
			var str = (interaction.options.getString("emojis") as string).split(
				" "
			);
		} else {
			var str = args!;
		}

		let cnt: number = 0;
		let nemj: string = "";

		for (const emoji of str) {
			const match = emoji.match(/:(\w+):(\d+)>/);
			if (match) {
				const isAnimated = emoji.startsWith("<a:");

				await interaction.guild?.emojis
					.create({
						attachment: `https://cdn.discordapp.com/emojis/${match[2]}.${isAnimated ? "gif" : "png"}`,
						name: match[1]
					})
					.then((emoji) => {
						client.func.method.channelSend(
							interaction,
							lang.emoji_send_new_emoji
								.replace("${emojiName}", emoji.name!)
								.replace("${emoji}", emoji.toString())
						);

						cnt++;
						nemj += `<${isAnimated ? "a:" : ":"}${emoji.name}:${emoji.id}>`;
					})
					.catch(() => {
						client.func.method.channelSend(
							interaction,
							lang.emoji_send_err_emoji.replace(
								"${emojiName}",
								emoji
							)
						);
					});

				await sleep(6000);
			}
		}

		await sendCard(
			client,
			interaction,
			buildCard({
				accent: cnt ? ACCENT.success : ACCENT.warning,
				emoji: client.iHorizon_Emojis.Sparkles,
				title: lang.emoji_card_title,
				description: `-# ${lang.emoji_card_count
					.replace("${count}", cnt.toString())
					.replace("${guild}", interaction.guild.name)}`,
				thumbnail: interaction.guild.iconURL({ size: 128 }),
				blocks: [nemj],
				signature: await botSignature(client, interaction.guildId)
			})
		);
		return;
	}
};
