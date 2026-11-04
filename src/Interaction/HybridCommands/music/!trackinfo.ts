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

/*
 * Track card (Components V2): artwork, title, author, length, source and
 * lyrics of a searched track, or of the track playing in the server when no
 * title is given.
 */

import {
	ActionRowBuilder,
	AttachmentBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	Client,
	ContainerBuilder,
	Message,
	MessageFlags,
	SectionBuilder,
	SeparatorBuilder,
	TextDisplayBuilder,
	ThumbnailBuilder,
	User,
	escapeMarkdown
} from "discord.js";
import { LanguageData } from "../../../../types/languageData.js";

import { SubCommand } from "../../../../types/command.js";
import { loadArtwork } from "../../../core/modules/musicCards.js";
import { formatDuration } from "../../../core/modules/queuePanel.js";

const LYRICS_MAX_LENGTH = 3000;
const DEFAULT_ACCENT = 0x6fa8dc;

function safeUrl(value?: string | null): string | null {
	if (!value) return null;
	try {
		const url = new URL(value);
		return url.protocol === "https:" || url.protocol === "http:"
			? url.toString()
			: null;
	} catch {
		return null;
	}
}

/** Markdown link label: escaped, brackets included. */
function linkLabel(value: string): string {
	return escapeMarkdown(value).replaceAll("[", "\\[").replaceAll("]", "\\]");
}

function artworkFileName(buffer: Buffer): string {
	if (buffer[0] === 0xff && buffer[1] === 0xd8) return "trackinfo.jpg";
	if (buffer.subarray(0, 4).toString("ascii") === "GIF8")
		return "trackinfo.gif";
	return "trackinfo.png";
}

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

		const query = (
			interaction instanceof ChatInputCommandInteraction
				? interaction.options.getString("title")
				: client.func.method.longString(args ?? [], 0)
		)?.trim();

		// No title: the track playing in this server.
		let track = query
			? undefined
			: client.player.getPlayer(interaction.guild.id)?.queue.current;

		if (query) {
			const { res } = await client.func.musicPlay.searchMusicQuery(
				client,
				query,
				interaction.member.user
			);
			if (!res || res.tracks.length <= 0) {
				await client.func.method.interactionSend(interaction, {
					embeds: [client.func.musicPlay.buildNoResultEmbed(lang)]
				});
				return;
			}
			track = res.tracks[0];
		}

		if (!track) {
			await client.func.method.interactionSend(interaction, {
				content: lang.nowplaying_no_queue
			});
			return;
		}
		const info = track.info;

		// Artwork through the bot's public-only fetcher; a missing or
		// unreadable image only drops the thumbnail and the accent colour.
		const [artwork, lyrics] = await Promise.all([
			loadArtwork(info.artworkUrl).catch(() => null),
			client.func
				.searchLyrics(track)
				.catch(() => null)
		]);
		const colors = artwork
			? await client.func.image_dominant_color(artwork).catch(() => null)
			: null;
		const accent = colors
			? parseInt(colors.color1.replace("#", ""), 16)
			: NaN;

		const url = safeUrl(info.uri);
		const title = linkLabel(info.title || "?");
		const requester = (track.requester as User | undefined)?.id;
		const meta = [
			info.isStream || !info.duration
				? lang.nowplaying_live
				: formatDuration(info.duration),
			info.sourceName ? `${lang.var_source}${info.sourceName}` : null,
			requester
				? lang.nowplaying_requested_by.replace(
						"${user}",
						`<@${requester}>`
					)
				: null
		].filter(Boolean);

		const heading = new TextDisplayBuilder().setContent(
			[
				`## ${client.iHorizon_Emojis.Music_Icon} ${url ? `[${title}](${url})` : title}`,
				escapeMarkdown(info.author || "?"),
				`-# ${meta.join(" · ")}`
			].join("\n")
		);

		const container = new ContainerBuilder().setAccentColor(
			Number.isFinite(accent) ? accent : DEFAULT_ACCENT
		);
		const fileName = artwork ? artworkFileName(artwork) : null;
		if (fileName) {
			container.addSectionComponents(
				new SectionBuilder()
					.addTextDisplayComponents(heading)
					.setThumbnailAccessory(
						new ThumbnailBuilder().setURL(
							`attachment://${fileName}`
						)
					)
			);
		} else {
			container.addTextDisplayComponents(heading);
		}

		const text = lyrics?.res?.text?.trim();
		const lyricsBody = text
			? escapeMarkdown(
					text.length > LYRICS_MAX_LENGTH
						? `${text.substring(0, LYRICS_MAX_LENGTH)}...`
						: text
				)
			: `-# ${lang.lyrics_not_found}`;
		container
			.addSeparatorComponents(new SeparatorBuilder())
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`### ${client.iHorizon_Emojis.Micro} ${lang.music_lyrics}\n${lyricsBody}`
				)
			);

		if (url) {
			container.addActionRowComponents(
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setStyle(ButtonStyle.Link)
						.setURL(url)
						.setLabel(lang.nowplaying_button_open)
				)
			);
		}

		return await client.func.method.interactionSend(interaction, {
			components: [container],
			files:
				artwork && fileName
					? [new AttachmentBuilder(artwork, { name: fileName })]
					: [],
			flags: [MessageFlags.IsComponentsV2],
			allowedMentions: { parse: [] }
		});
	}
};
