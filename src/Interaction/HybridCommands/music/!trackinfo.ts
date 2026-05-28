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
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	Client,
	ColorResolvable,
	EmbedBuilder,
	GuildMember,
	Message,
	MessageFlags,
	User
} from "discord.js";
import { LanguageData } from "../../../../types/languageData.js";

import { SubCommand } from "../../../../types/command.js";

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
			var query = interaction.options.getString("title");
		} else {
			var query = client.func.method.longString(args!, 0);
		}

		const { res } = await client.func.musicPlay.searchMusicQuery(
			client,
			query || "",
			interaction.member.user
		);

		if (!res || res.tracks.length <= 0) {
			await client.func.method.interactionSend(interaction, {
				embeds: [client.func.musicPlay.buildNoResultEmbed(lang)],
				flags: MessageFlags.Ephemeral
			});
			return;
		}

		const track = res.tracks[0];

		const { color1, color2 } = await client.func.image_dominant_color(
			track.info.artworkUrl ||
				"https://www.ihorizon.org/assets/img/unknown-user.png"
		);

		let { res: responseLyrics } =
			(await client.func.searchLyrics(String(query))) ?? {};

		const trimmedLyrics =
			responseLyrics?.text?.substring(0, 1997) || lang.lyrics_not_found;

		const embed = new EmbedBuilder()
			.setColor(color1 as ColorResolvable)
			.setTitle(
				`${client.iHorizon_Emojis.Music_Icon} ${track.info.title}`
			)
			.setThumbnail(track.info.artworkUrl)
			.setFooter({
				text: `${track.info.author} - ${lang.music_requested_by} ${(track.requester as User).username}`
			})
			.setDescription(`${lang.music_link_here.replace("{link}", track.info.uri)}
# ${client.iHorizon_Emojis.Micro} ${lang.music_lyrics}
*${trimmedLyrics}*
				`);

		const button = new ButtonBuilder()
			.setStyle(ButtonStyle.Link)
			.setURL(track.info.uri)
			.setLabel(lang.music_visit_here);

		const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
			button
		);

		return await client.func.method.interactionSend(interaction, {
			embeds: [embed],
			components: [actionRow]
		});
	}
};
