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

import { LanguageData } from "../../../../../types/languageData.js";
import { axios } from "../../../../core/functions/axios.js";

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

		if (interaction instanceof ChatInputCommandInteraction) {
			var user: User | undefined =
				interaction.options.getUser("user") || interaction.user;
		} else {
			var user: User | undefined =
				(await client.func.method.user(interaction, args!, 0)) ||
				interaction.author;
		}

		const config = {
			headers: {
				Authorization: `Bot ${client.token}`
			}
		};

		const user_1 = (
			await axios.get(
				`https://discord.com/api/v10/users/${user?.id}`,
				config
			)
		)?.data;
		const banner: string | null | undefined = user_1?.banner;

		if (!banner) {
			client.func.method.interactionSend(interaction, {
				content: lang.banner_user_no_banner
			});
			return;
		}

		const animated = banner.startsWith("a_");
		const url = (extension: "png" | "webp" | "gif") =>
			`https://cdn.discordapp.com/banners/${user_1?.id}/${banner}.${extension}?size=4096`;
		const formats = [
			`[PNG](${url("png")})`,
			`[WEBP](${url("webp")})`,
			animated ? `[GIF](${url("gif")})` : null
		].filter(Boolean);

		await sendCard(
			client,
			interaction,
			buildCard({
				accent: user_1?.accent_color ?? ACCENT.info,
				emoji: client.iHorizon_Emojis.Camera,
				title: lang.banner_card_user_title.replace(
					"${user}",
					user?.displayName ?? user_1?.username
				),
				description: `<@${user_1?.id}>\n-# ${lang.card_download} : ${formats.join(" · ")}`,
				thumbnail: user?.displayAvatarURL({ size: 256 }),
				images: [
					`https://cdn.discordapp.com/banners/${user_1?.id}/${banner}.${animated ? "gif" : "png"}?size=1024`
				],
				signature: await botSignature(client, interaction.guildId)
			})
		);
		return;
	}
};
