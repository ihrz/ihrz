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
 * /music playlist (Components V2): the invoker's music library, the same
 * one as the dashboard's player (musicLibrary.ts).
 *
 * - Home: the liked tracks count and every playlist (tracks, duration), a
 *   menu to open one.
 * - A list: its tracks, ten per page, Play (queues it like the dashboard's
 *   music.playlist-play / music.favorites-play: musicLibraryPlay.ts) and
 *   Back.
 * - Only the invoker can use it; disabled after ten minutes.
 */

import {
	ActionRowBuilder,
	AutocompleteInteraction,
	ButtonBuilder,
	ButtonStyle,
	Client,
	ComponentType,
	ContainerBuilder,
	Guild,
	GuildMember,
	Message,
	MessageFlags,
	SectionBuilder,
	SeparatorBuilder,
	SeparatorSpacingSize,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	TextDisplayBuilder,
	ThumbnailBuilder,
	escapeMarkdown
} from "discord.js";

import type { DatabaseStructure } from "../../../types/database_structure.js";
import type { LanguageData } from "../../../types/languageData.js";
import { musicPlayRefusalPayload } from "../functions/musicPlay.js";
import logger from "../logger.js";
import { hasErrorName, isComponentBuilder } from "../functions/typeGuards.js";
import { DASHBOARD_URL } from "./guildWelcome.js";
import {
	allFavorites,
	favoritesCount,
	favoritesPage,
	listPlaylists,
	MAX_PLAYLIST_TRACKS,
	MAX_PLAYLISTS,
	playlistTracks
} from "./musicLibrary.js";
import { playLibraryTracks } from "./musicLibraryPlay.js";
import {
	clampPage,
	clip,
	findLibraryList,
	formatLibraryDuration,
	LIBRARY_PAGE_SIZE,
	libraryIsEmpty,
	libraryOverviewLines,
	libraryTrackLine,
	LIKED_VALUE,
	pageCount,
	parseLibraryValue,
	playlistValue
} from "./musicLibraryView.js";
import type { NowPlayingPayload } from "./nowPlayingPanel.js";

type LibraryTrack = DatabaseStructure.LibraryTrack;
type LibraryPlaylist = DatabaseStructure.LibraryPlaylist;

const LIFETIME_MS = 10 * 60 * 1000;
const ACCENT = 0xe0245e;

export const LIBRARY_ID = {
	open: "music_library_open",
	previous: "music_library_previous",
	next: "music_library_next",
	play: "music_library_play",
	back: "music_library_back"
} as const;

type View =
	| { kind: "home"; liked: number; playlists: LibraryPlaylist[] }
	| { kind: "liked"; count: number; tracks: LibraryTrack[] }
	| {
			kind: "playlist";
			playlist: LibraryPlaylist;
			tracks: LibraryTrack[];
	  };

export interface LibraryPanelOptions {
	client: Client;
	lang: LanguageData;
	guild: Guild;
	userId: string;
	/** A playlist to open first (its name or id, or the liked tracks). */
	open?: string | null;
	/** Sends the panel message (the reply). */
	send: (payload: NowPlayingPayload) => Promise<Message>;
	/** Edits it after it expired (an ephemeral reply: editReply). */
	edit: (payload: NowPlayingPayload) => Promise<unknown>;
}

function safeUrl(value?: string | null): string | null {
	if (!value) return null;
	try {
		const url = new URL(value);
		return url.protocol === "https:" ? url.toString() : null;
	} catch {
		return null;
	}
}

export async function openLibraryPanel(
	options: LibraryPanelOptions
): Promise<Message> {
	const { client, lang, guild, userId } = options;
	const emojis = client.iHorizon_Emojis;
	const likedName = lang.music_library_liked_name;
	const tracksLabel = (n: number) =>
		lang.music_playlist_tracks.replace("${count}", String(n));

	let page = 0;
	let expired = false;
	let note: string | null = null;

	const home = async (): Promise<View> => ({
		kind: "home",
		liked: await favoritesCount(userId),
		playlists: await listPlaylists(userId)
	});
	const liked = async (): Promise<View> => {
		const first = await favoritesPage(
			userId,
			page * LIBRARY_PAGE_SIZE,
			LIBRARY_PAGE_SIZE
		);
		// The list shrank (removed elsewhere): back to its last page.
		const fixed = clampPage(page, first.count);
		if (fixed === page) return { kind: "liked", ...first };
		page = fixed;
		return {
			kind: "liked",
			...(await favoritesPage(
				userId,
				page * LIBRARY_PAGE_SIZE,
				LIBRARY_PAGE_SIZE
			))
		};
	};
	const playlist = async (id: string): Promise<View> => {
		try {
			const { playlist, tracks } = await playlistTracks(userId, id);
			page = clampPage(page, tracks.length);
			return { kind: "playlist", playlist, tracks };
		} catch (error) {
			if (!hasErrorName(error, "LibraryError")) throw error;
			note = lang.music_playlist_gone;
			page = 0;
			return home();
		}
	};

	let view: View = await home();
	if (options.open && view.kind === "home") {
		const target = findLibraryList(view.playlists, options.open, likedName);
		if (target?.kind === "liked") view = await liked();
		else if (target) view = await playlist(target.id);
		else note = lang.music_playlist_not_found;
	}

	const header = (title: string, stats: string, cover?: string | null) => {
		const text = new TextDisplayBuilder().setContent(
			`## ${title}\n-# ${stats}`
		);
		const url = safeUrl(cover);
		return url
			? new SectionBuilder()
					.addTextDisplayComponents(text)
					.setThumbnailAccessory(new ThumbnailBuilder().setURL(url))
			: text;
	};

	const build = (): ContainerBuilder => {
		const container = new ContainerBuilder().setAccentColor(ACCENT);
		const add = (part: TextDisplayBuilder | SectionBuilder) =>
			isComponentBuilder(part, ComponentType.Section)
				? container.addSectionComponents(part as SectionBuilder)
				: container.addTextDisplayComponents(
						part as TextDisplayBuilder
					);
		const separator = () =>
			container.addSeparatorComponents(
				new SeparatorBuilder()
					.setDivider(true)
					.setSpacing(SeparatorSpacingSize.Small)
			);

		if (view.kind === "home") {
			add(
				header(
					`❤️ ${escapeMarkdown(lang.music_playlist_title)}`,
					lang.music_playlist_stats
						.replace("${playlists}", String(view.playlists.length))
						.replace("${max}", String(MAX_PLAYLISTS))
				)
			);
			separator();
			if (note)
				container.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(`-# ${note}`)
				);
			if (libraryIsEmpty(view.liked, view.playlists)) {
				container.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						lang.music_playlist_empty
							.replaceAll("${playlist}", likedName)
							.replaceAll("${button}", lang.music_love_button)
							.replaceAll("${url}", DASHBOARD_URL)
					)
				);
				return container;
			}
			container.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					libraryOverviewLines(lang, view.liked, view.playlists).join(
						"\n"
					)
				)
			);
			const menu = new StringSelectMenuBuilder()
				.setCustomId(LIBRARY_ID.open)
				.setPlaceholder(lang.music_playlist_select)
				.setDisabled(expired)
				.addOptions(
					new StringSelectMenuOptionBuilder()
						.setValue(LIKED_VALUE)
						.setEmoji("❤️")
						.setLabel(clip(likedName, 100))
						.setDescription(tracksLabel(view.liked)),
					...view.playlists.slice(0, 24).map((p) =>
						new StringSelectMenuOptionBuilder()
							.setValue(playlistValue(p.id))
							.setEmoji("🎵")
							.setLabel(clip(p.name || "?", 100))
							.setDescription(
								clip(
									`${tracksLabel(p.count)} · ${formatLibraryDuration(p.duration)}`,
									100
								)
							)
					)
				);
			container.addActionRowComponents(
				new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
					menu
				)
			);
			return container;
		}

		const total = view.kind === "liked" ? view.count : view.tracks.length;
		const pages = pageCount(total);
		const start = page * LIBRARY_PAGE_SIZE;
		const shown =
			view.kind === "liked"
				? view.tracks
				: view.tracks.slice(start, start + LIBRARY_PAGE_SIZE);
		if (view.kind === "liked") {
			add(header(`❤️ ${escapeMarkdown(likedName)}`, tracksLabel(total)));
		} else {
			add(
				header(
					`🎵 ${escapeMarkdown(clip(view.playlist.name || "?", 80))}`,
					`${tracksLabel(total)} · ${formatLibraryDuration(view.playlist.duration)}`,
					view.playlist.cover
				)
			);
		}
		separator();
		container.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				shown.length
					? shown
							.map((t, i) => libraryTrackLine(lang, t, start + i))
							.join("\n")
					: `-# ${lang.music_playlist_no_tracks}`
			)
		);
		container.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				`-# ${lang.queue_page
					.replace("${page}", String(page + 1))
					.replace("${pages}", String(pages))}`
			)
		);
		container.addActionRowComponents(
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId(LIBRARY_ID.previous)
					.setLabel("<")
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(expired || page === 0),
				new ButtonBuilder()
					.setCustomId(LIBRARY_ID.next)
					.setLabel(">")
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(expired || page >= pages - 1),
				new ButtonBuilder()
					.setCustomId(LIBRARY_ID.play)
					.setEmoji(emojis.Player_Play)
					.setLabel(lang.music_playlist_play)
					.setStyle(ButtonStyle.Success)
					.setDisabled(expired || total === 0),
				new ButtonBuilder()
					.setCustomId(LIBRARY_ID.back)
					.setLabel(lang.music_playlist_back)
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(expired)
			)
		);
		return container;
	};

	const payload = (): NowPlayingPayload => ({
		components: [build()],
		flags: [MessageFlags.IsComponentsV2],
		allowedMentions: { parse: [] }
	});

	const response = await options.send(payload());
	if (view.kind === "home" && libraryIsEmpty(view.liked, view.playlists))
		return response;

	const collector = response.createMessageComponentCollector({
		time: LIFETIME_MS
	});

	collector.on("collect", async (i) => {
		try {
			if (i.user.id !== userId) {
				await i.reply({
					content: lang.help_not_for_you,
					flags: [MessageFlags.Ephemeral]
				});
				return;
			}
			note = null;
			switch (i.customId) {
				case LIBRARY_ID.open: {
					if (!i.isStringSelectMenu()) return;
					const target = parseLibraryValue(i.values[0] ?? "");
					if (!target) return;
					page = 0;
					view =
						target.kind === "liked"
							? await liked()
							: await playlist(target.id);
					break;
				}
				case LIBRARY_ID.previous:
				case LIBRARY_ID.next: {
					if (view.kind === "home") return;
					page += i.customId === LIBRARY_ID.next ? 1 : -1;
					view =
						view.kind === "liked"
							? await liked()
							: await playlist(view.playlist.id);
					break;
				}
				case LIBRARY_ID.back:
					page = 0;
					view = await home();
					break;
				case LIBRARY_ID.play: {
					if (view.kind === "home") return;
					await i.deferReply({ flags: [MessageFlags.Ephemeral] });
					const current = view;
					let name: string;
					let tracks: LibraryTrack[];
					if (current.kind === "liked") {
						name = likedName;
						tracks = await allFavorites(
							userId,
							MAX_PLAYLIST_TRACKS
						);
					} else {
						try {
							const fresh = await playlistTracks(
								userId,
								current.playlist.id
							);
							name = fresh.playlist.name;
							tracks = fresh.tracks;
						} catch (error) {
							if (!hasErrorName(error, "LibraryError"))
								throw error;
							await i.editReply({
								content: lang.music_playlist_gone
							});
							return;
						}
					}
					const member =
						guild.members.cache.get(userId) ??
						(i.member as GuildMember);
					const result = await playLibraryTracks({
						client,
						lang,
						guild,
						member,
						name,
						tracks,
						fallbackChannelId: i.channelId
					});
					await i.editReply({
						...(result.ok
							? {
									content: lang.music_playlist_queued
										.replace(
											"${name}",
											escapeMarkdown(clip(name, 80))
										)
										.replace(
											"${count}",
											String(result.queued)
										)
								}
							: result.reason === "empty"
								? { content: lang.music_playlist_no_tracks }
								: musicPlayRefusalPayload(
										client,
										lang,
										result.reason
									)),
						allowedMentions: { parse: [] }
					});
					return;
				}
				default:
					return;
			}
			await i.update(payload());
		} catch (error) {
			logger.err(error);
		}
	});

	collector.on("end", () => {
		expired = true;
		options.edit(payload()).catch(() => null);
	});

	return response;
}

/** /music playlist `name`: the liked tracks then the user's playlists. */
export async function musicLibraryAutocomplete(
	client: Client,
	interaction: AutocompleteInteraction
): Promise<void> {
	try {
		const lang = await client.func.getLanguageData(interaction.guildId);
		const query = String(interaction.options.getFocused() ?? "")
			.trim()
			.toLowerCase();
		const choices = [
			{ name: lang.music_library_liked_name, value: LIKED_VALUE },
			...(await listPlaylists(interaction.user.id)).map((p) => ({
				name: `${p.name || "?"} (${p.count})`,
				value: playlistValue(p.id)
			}))
		]
			.filter((c) => !query || c.name.toLowerCase().includes(query))
			.slice(0, 25)
			.map((c) => ({ name: clip(c.name, 100), value: c.value }));
		await interaction.respond(choices).catch(() => null);
	} catch (error) {
		logger.err(error);
	}
}
