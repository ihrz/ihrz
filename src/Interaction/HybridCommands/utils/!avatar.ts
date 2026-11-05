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

import { ChatInputCommandInteraction, Client, Message, User } from "discord.js";
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

		const member =
			interaction instanceof ChatInputCommandInteraction
				? interaction.options.getUser("user")
				: await client.func.method.user(interaction, args!, 0);

		const mentionedUser = member || (interaction.member.user as User);

		// The profile's accent colour when Discord has it.
		const user = await mentionedUser.fetch().catch(() => mentionedUser);
		const url = (extension: "png" | "webp" | "gif") =>
			user.displayAvatarURL({ extension, size: 1024 });
		const formats = [
			`[PNG](${url("png")})`,
			`[WEBP](${url("webp")})`,
			user.avatar?.startsWith("a_") ? `[GIF](${url("gif")})` : null
		].filter(Boolean);

		await sendCard(
			client,
			interaction,
			buildCard({
				accent: user.accentColor ?? ACCENT.info,
				emoji: client.iHorizon_Emojis.Camera,
				title: lang.avatar_card_title.replace(
					"${user}",
					user.displayName
				),
				description: `${user}\n-# ${lang.card_download} : ${formats.join(" · ")}`,
				images: [
					user.displayAvatarURL({ size: 1024, forceStatic: false })
				],
				signature: await botSignature(client, interaction.guildId)
			})
		);
		return;
	}
};
