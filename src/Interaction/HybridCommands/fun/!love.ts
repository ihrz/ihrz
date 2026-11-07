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

import { Client, ChatInputCommandInteraction, User, Message } from "discord.js";
import { LanguageData } from "../../../../types/languageData.js";
import logger from "../../../core/logger.js";
import { SubCommand } from "../../../../types/command.js";
import { love } from "../../../core/images.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	sendCardWithFiles
} from "../../../core/modules/uiCard.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		if (
			(await client.db.get(`${interaction.guildId}.GUILD.FUN.states`)) ===
			"off"
		) {
			await client.func.method.interactionSend(interaction, {
				content: lang.fun_category_disable
			});
			return;
		}
		const opts = client.func.method.options(interaction, args);
		const user1 =
			(await opts.user("user1", 0)) ||
			(interaction instanceof ChatInputCommandInteraction
				? interaction.user
				: interaction.author);
		const user2 =
			(await opts.user("user2", 1)) ||
			(interaction.guild?.members.cache.random()?.user as User);

		try {
			const loveResult = await love(
				user1.displayAvatarURL({ extension: "png", size: 512 }),
				user2.displayAvatarURL({ extension: "png", size: 512 })
			);
			const always100: Array<string> = client.config.command.always100;

			const found = always100.find((element) => {
				if (
					element === `${user1.id}x${user2.id}` ||
					element === `${user2.id}x${user1.id}`
				) {
					return true;
				}
				return false;
			});

			let randomNumber: number;
			if (found) {
				randomNumber = 100;
			} else {
				randomNumber = client.func.random.secureRandomInt(0, 100);
			}

			await sendCardWithFiles(
				client,
				interaction,
				[{ attachment: loveResult, name: "love.png" }],
				buildCard({
					accent: ACCENT.neutral,
					emoji: client.iHorizon_Emojis.Blushed,
					title: lang.love_card_title,
					description: lang.love_card_desc
						.replace("${user1}", user1.username)
						.replace("${user2}", user2.username)
						.replace("${percent}", randomNumber.toString()),
					images: ["attachment://love.png"],
					signature: await botSignature(client, interaction.guildId)
				})
			);
		} catch (error) {
			logger.err(error);
			await client.func.method.interactionSend(interaction, {
				content: lang.love_command_error
			});
		}
	}
};
