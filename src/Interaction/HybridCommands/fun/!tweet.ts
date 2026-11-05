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
	AttachmentBuilder,
	ChatInputCommandInteraction,
	Client,
	Message,
	User
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";

import { sanitizing } from "../../../core/functions/sanitizer.js";
import { SubCommand } from "../../../../types/command.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	sendCardWithFiles
} from "../../../core/modules/uiCard.js";
import { renderTweet } from "../../../core/modules/socialCards.js";

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
		if (interaction instanceof ChatInputCommandInteraction) {
			var user: User =
				(interaction.options.getUser("user") as User) ||
				interaction.user;
			var entry = interaction.options.getString("comment");
			var messageArgs = entry!.split(" ");
		} else {
			var user: User =
				(await client.func.method.user(interaction, args!, 0)) ||
				interaction.author;
			var entry = client.func.method.longString(args!, 1);
			var messageArgs = entry!.split(" ");
		}

		if (messageArgs.length < 1) {
			await client.func.method.interactionSend(interaction, {
				content: lang.fun_var_good_sentence
			});
			return;
		}

		let username = user.globalName || user.displayName || user.username;

		if (username && username.length > 15) {
			username = username.substring(0, 15);
		}

		const randomLikes = client.func.random.secureRandomInt(1, 90_000);
		const randomRetweets = client.func.random.secureRandomInt(1, 50_000);
		const randomReplies = client.func.random.secureRandomInt(1, 10_000);
		const randomViews = client.func.random.secureRandomInt(1_000, 500_000);

		const img = await renderTweet({
			displayName: sanitizing(username),
			handle: `@${sanitizing(user.username)}`,
			avatar:
				(await client.func.image64.image64(
					user.displayAvatarURL({ extension: "png", size: 128 })
				)) ?? null,
			content: sanitizing(messageArgs.join(" ")),
			ago: "2h",
			replies: client.func.numberBeautifuer(randomReplies),
			retweets: client.func.numberBeautifuer(randomRetweets),
			likes: client.func.numberBeautifuer(randomLikes),
			views: client.func.numberBeautifuer(randomViews)
		});

		const imgs = new AttachmentBuilder(img, { name: "twitter.png" });

		await sendCardWithFiles(
			client,
			interaction,
			[imgs],
			buildCard({
				accent: ACCENT.neutral,
				emoji: client.iHorizon_Emojis.Sparkles,
				title: lang.tweet_card_title.replace("${user}", username),
				images: ["attachment://twitter.png"],
				signature: await botSignature(client, interaction.guildId)
			})
		);
		return;
	}
};
