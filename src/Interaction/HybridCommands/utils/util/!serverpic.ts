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
import { LanguageData } from "../../../../../types/languageData.js";
import { SubCommand } from "../../../../../types/command.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	sendCard
} from "../../../../core/modules/uiCard.js";

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

		const guild = interaction.guild;
		const url = (extension: "png" | "webp" | "gif") =>
			guild.iconURL({
				extension,
				size: 4096,
				forceStatic: extension !== "gif"
			});
		const formats = [
			`[PNG](${url("png")})`,
			`[WEBP](${url("webp")})`,
			guild.icon?.startsWith("a_") ? `[GIF](${url("gif")})` : null
		].filter(Boolean);

		await sendCard(
			client,
			interaction,
			buildCard({
				accent: ACCENT.info,
				emoji: client.iHorizon_Emojis.Camera,
				title: lang.serverpic_card_title.replace(
					"${guild}",
					guild.name
				),
				description: guild.icon
					? `-# ${lang.card_download} : ${formats.join(" · ")}`
					: lang.serverpic_card_no_icon,
				images: [guild.iconURL({ size: 4096, forceStatic: false })],
				signature: await botSignature(client, guild.id)
			})
		);
		return;
	}
};
