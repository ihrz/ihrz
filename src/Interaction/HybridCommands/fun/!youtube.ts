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
	EmbedBuilder,
	Message,
	User
} from "discord.js";

import { AxiosResponse, axios } from "../../../core/functions/axios.js";
import { LanguageData } from "../../../../types/languageData.js";

import { sanitizing } from "../../../core/functions/sanitizer.js";
import { SubCommand } from "../../../../types/command.js";

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

		let username = user.globalName || user.username;

		if (username && username.length > 15) {
			username = username.substring(0, 15);
		}

		const random = Math.floor(Math.random() * (90_000 - 1 + 1)) + 1;

		let code = client.htmlfiles["youtubeCommentCard"]
			.replace("{comment}", sanitizing(messageArgs.join(" ")))
			.replace("{ago}", "2 hours ago")
			.replace(
				"{pfp}",
				user.displayAvatarURL({ extension: "png", size: 1024 })
			)
			.replace("{displayname}", sanitizing(username))
			.replace("{likes}", client.func.numberBeautifuer(random))
			.replace("{reply}", "REPLY");

		const img = await client.func.html2png(code, {
			omitBackground: true,
			selectElement: true,
			elementSelector: ".comment",
			width: 800,
			height: 200,
			scaleSize: 1.2
		});

		const embed = new EmbedBuilder()
			.setColor("#010101")
			.setImage("attachment://youtube.png")
			.setTimestamp()
			.setFooter(
				await client.func.displayBotName.footerBuilder(
					interaction.guildId!
				)
			);

		let imgs = new AttachmentBuilder(img, { name: "youtube.png" });
		embed.setImage(`attachment://youtube.png`);

		await client.func.method.interactionSend(interaction, {
			embeds: [embed],
			files: [
				imgs!,
				await interaction.client.func.displayBotName.footerAttachmentBuilder(
					interaction
				)
			]
		});
		return;
	}
};
