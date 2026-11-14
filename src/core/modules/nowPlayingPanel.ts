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
 * Now playing panel (Components V2) around a compact player card rendered
 * with resvg. Used as the reply of /music play and /music nowplaying.
 *
 * - It follows the guild's player: when the track changes it loads the new
 *   artwork / accent and re-renders the card, so it doubles as the "now
 *   playing" announcement. It switches to its ended state when the queue is
 *   over, the player is gone, or a newer panel opens in the same guild (one
 *   live panel per guild keeps the edit rate low).
 * - The card is re-rendered only when its time or pause state changed, and
 *   an edit is skipped when nothing visible changed.
 * - `notes` are extra lines (added to the queue, Last.fm tip) shown until
 *   the first track change.
 *
 * Player icons (iHorizon_Player_*): the Spotify-style set by Jay on
 * emoji.gg (https://emoji.gg/user/madlyluckie, Basic License); Play and
 * Stop are drawn to match their Pause.
 */

import { markPaused, trackPosition } from "./trackClock.js";
import { destroyPlayerSafely, playerNodeReady } from "./audioNode.js";
import { crossfadeSkip } from "./musicCrossfadeSkip.js";
import { musicRights } from "./musicControls.js";
import {
	ActionRowBuilder,
	AttachmentBuilder,
	BaseGuildTextChannel,
	BaseMessageOptions,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	Client,
	ComponentType,
	ContainerBuilder,
	GuildMember,
	MediaGalleryBuilder,
	MediaGalleryItemBuilder,
	Message,
	MessageFlags,
	SectionBuilder,
	SeparatorBuilder,
	SeparatorSpacingSize,
	TextDisplayBuilder,
	ThumbnailBuilder,
	User,
	escapeMarkdown
} from "discord.js";

import { LanguageData } from "../../../types/languageData.js";
import { loadArtwork, renderNowPlaying } from "./musicCards.js";

type Player = NonNullable<ReturnType<Client["player"]["getPlayer"]>>;
type Track = NonNullable<Player["queue"]["current"]>;
type RepeatMode = "off" | "track" | "queue";

export type NowPlayingPayload = BaseMessageOptions & {
	flags: [MessageFlags.IsComponentsV2];
};

export interface NowPlayingPanelOptions {
	client: Client;
	lang: LanguageData;
	guildId: string;
	/** Sends (or edits in) the panel message: a reply, an editReply... */
	send: (payload: NowPlayingPayload) => Promise<Message>;
	/** Lines shown under the details until the first track change. */
	notes?: string[];
}

// Close to the old card refresh; stays under the per-channel edit limit.
const REFRESH_MS = 6_000;
// Hard cap for one panel (long playlists, streams): it then shows ended.
const MAX_LIFETIME_MS = 6 * 60 * 60 * 1000;
const DEFAULT_ACCENT = 0x6fa8dc;
const CARD_NAME = "nowplaying.png";
const LYRICS_MAX_LENGTH = 3500;
const NEXT_REPEAT_MODE: Record<RepeatMode, RepeatMode> = {
	off: "track",
	track: "queue",
	queue: "off"
};

const BUTTON = {
	pause: "nowplaying_pause",
	skip: "nowplaying_skip",
	loop: "nowplaying_loop",
	stop: "nowplaying_stop",
	lyrics: "nowplaying_lyrics"
} as const;

// Lavalink source name -> display name and bot emoji (when there is one).
export const SOURCES: Record<string, { name: string; emoji?: string }> = {
	deezer: { name: "Deezer", emoji: "Deezer" },
	soundcloud: { name: "SoundCloud", emoji: "SoundCloud" },
	youtube: { name: "YouTube" },
	youtubemusic: { name: "YouTube Music" },
	spotify: { name: "Spotify" },
	applemusic: { name: "Apple Music" },
	tidal: { name: "Tidal" },
	amazonmusic: { name: "Amazon Music" },
	bandcamp: { name: "Bandcamp" },
	twitch: { name: "Twitch" },
	http: { name: "HTTP" }
};

/** Closes the live panel of a guild (a newer one replaces it). */
const activePanels = new Map<string, () => void>();

/** Markdown link label: escaped, brackets included. */
function linkLabel(value: string): string {
	return escapeMarkdown(value).replaceAll("[", "\\[").replaceAll("]", "\\]");
}

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

function artworkFileName(buffer: Buffer): string {
	if (buffer[0] === 0xff && buffer[1] === 0xd8) return "nowplaying.jpg";
	if (buffer.subarray(0, 4).toString("ascii") === "GIF8")
		return "nowplaying.gif";
	return "nowplaying.png";
}

function trackTitle(track: Track): string {
	const title = linkLabel(track.info.title || "?");
	const url = safeUrl(track.info.uri);
	return url ? `[${title}](${url})` : title;
}

interface TrackView {
	track: Track;
	artwork: Buffer | null;
	artworkName: string | null;
	colors: { color1: string; color2: string } | null;
	accent: number;
	isLive: boolean;
	url: string | null;
}

async function loadTrackView(client: Client, track: Track): Promise<TrackView> {
	const artwork = await loadArtwork(track.info.artworkUrl).catch(() => null);
	const colors = artwork
		? await client.func.image_dominant_color(artwork).catch(() => null)
		: null;
	const parsed = colors ? parseInt(colors.color1.replace("#", ""), 16) : NaN;
	return {
		track,
		artwork,
		artworkName: artwork ? artworkFileName(artwork) : null,
		colors,
		accent: Number.isFinite(parsed) ? parsed : DEFAULT_ACCENT,
		isLive: !!track.info.isStream || !track.info.duration,
		url: safeUrl(track.info.uri)
	};
}

function sameTrack(a: Track, b: Track): boolean {
	return a.encoded && b.encoded
		? a.encoded === b.encoded
		: a.info.identifier === b.info.identifier;
}

/** Opens a live panel for the guild's player; null when nothing plays. */
export async function openNowPlayingPanel(
	options: NowPlayingPanelOptions
): Promise<Message | null> {
	const { client, lang, guildId } = options;
	const emojis = client.iHorizon_Emojis;
	const player = client.player.getPlayer(guildId);
	const current = player?.queue.current;
	if (!player || !current) return null;

	let view = await loadTrackView(client, current);
	let notes = options.notes?.filter(Boolean) ?? [];

	const loopLabel = (mode: RepeatMode): string =>
		mode === "track"
			? lang.nowplaying_loop_track
			: mode === "queue"
				? lang.nowplaying_loop_queue
				: lang.nowplaying_loop_off;

	const sourceLine = (track: Track): string | null => {
		const key = (track.info.sourceName ?? "").toLowerCase();
		if (!key) return null;
		const source = SOURCES[key] ?? {
			name: key.charAt(0).toUpperCase() + key.slice(1)
		};
		const emoji = source.emoji
			? (emojis as unknown as Record<string, string>)[source.emoji]
			: undefined;
		const url = safeUrl(track.info.uri);
		const label = url ? `[${source.name}](${url})` : source.name;
		return `-# ${emoji ? `${emoji} ` : ""}${lang.var_source}${label}`;
	};

	/** What the player card shows; the card is re-rendered when it changes. */
	const cardState = (live: Player) => {
		const { track, isLive } = view;
		const position = isLive
			? 0
			: // The track the card shows: the live one may have just changed.
				live.queue.current && sameTrack(live.queue.current, track)
				? trackPosition(live)
				: 0;
		const times = client.func.generateProgressBar(
			emojis,
			position,
			track.info.duration || 0
		);
		return {
			progress: isLive ? 0 : position / track.info.duration,
			currentTime: times.currentTime,
			totalTime: times.totalTime,
			paused: !!live.paused
		};
	};
	const cardKey = (state: ReturnType<typeof cardState>) =>
		`${view.track.info.identifier}|${state.currentTime}|${state.paused}`;

	const renderCard = async (
		state: ReturnType<typeof cardState>
	): Promise<AttachmentBuilder> =>
		new AttachmentBuilder(
			await renderNowPlaying({
				title: view.track.info.title || "?",
				author: view.track.info.author || "",
				artwork: view.artwork,
				colorStart: view.colors?.color1 ?? "#5865F2",
				colorEnd: view.colors?.color2 ?? "#1e1f22",
				...state,
				liveLabel: view.isLive ? lang.nowplaying_live : undefined
			}),
			{ name: CARD_NAME }
		);

	const detailsLines = (live: Player): string[] => {
		const lines: string[] = [];
		const requester = view.track.requester as User | undefined;
		if (requester?.id) {
			lines.push(
				`${emojis.Player_Headphones} ${lang.nowplaying_requested_by.replace(
					"${user}",
					`<@${requester.id}>`
				)}`
			);
		}

		const next = live.queue.tracks[0];
		lines.push(
			next
				? `${emojis.Player_Queue} ${lang.nowplaying_up_next.replace(
						"${track}",
						`**${escapeMarkdown(next.info.title || "?")}**`
					)}`
				: `${emojis.Player_Queue} ${lang.nowplaying_queue_end}`
		);

		lines.push(
			`-# ${[
				lang.nowplaying_volume.replace(
					"${volume}",
					String(live.volume)
				),
				loopLabel(live.repeatMode as RepeatMode),
				lang.nowplaying_queue_count.replace(
					"${count}",
					String(live.queue.tracks.length)
				)
			].join(" · ")}`
		);

		const source = sourceLine(view.track);
		if (source) lines.push(source);
		return lines;
	};

	const buildPanel = (live: Player | null): ContainerBuilder => {
		const ended = !live;
		const container = new ContainerBuilder().setAccentColor(view.accent);

		container.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				`-# ${emojis.Player_Listening} ${lang.nowplaying_header.replace(
					"${channel}",
					`<#${player.voiceChannelId}>`
				)}`
			)
		);
		container.addMediaGalleryComponents(
			new MediaGalleryBuilder().addItems(
				new MediaGalleryItemBuilder().setURL(
					`attachment://${CARD_NAME}`
				)
			)
		);
		container.addSeparatorComponents(
			new SeparatorBuilder()
				.setDivider(true)
				.setSpacing(SeparatorSpacingSize.Small)
		);

		const details = new TextDisplayBuilder().setContent(
			live
				? detailsLines(live).join("\n")
				: `-# ${emojis.Player_Stop} ${lang.nowplaying_ended}`
		);
		if (view.url) {
			container.addSectionComponents(
				new SectionBuilder()
					.addTextDisplayComponents(details)
					.setButtonAccessory(
						new ButtonBuilder()
							.setStyle(ButtonStyle.Link)
							.setURL(view.url)
							.setLabel(lang.nowplaying_button_open)
					)
			);
		} else {
			container.addTextDisplayComponents(details);
		}

		if (live && notes.length > 0) {
			container.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(notes.join("\n"))
			);
		}

		const paused = !!live?.paused;
		container.addActionRowComponents(
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId(BUTTON.pause)
					.setEmoji(paused ? emojis.Player_Play : emojis.Player_Pause)
					.setLabel(
						paused
							? lang.nowplaying_button_resume
							: lang.nowplaying_button_pause
					)
					.setStyle(
						paused ? ButtonStyle.Success : ButtonStyle.Secondary
					)
					.setDisabled(ended),
				new ButtonBuilder()
					.setCustomId(BUTTON.skip)
					.setEmoji(emojis.Player_Next)
					.setLabel(lang.nowplaying_button_skip)
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(ended),
				new ButtonBuilder()
					.setCustomId(BUTTON.loop)
					.setEmoji(emojis.Player_Repeat)
					.setLabel(
						loopLabel((live?.repeatMode as RepeatMode) ?? "off")
					)
					.setStyle(
						live && live.repeatMode !== "off"
							? ButtonStyle.Primary
							: ButtonStyle.Secondary
					)
					.setDisabled(ended),
				new ButtonBuilder()
					.setCustomId(BUTTON.lyrics)
					.setEmoji(emojis.Player_Lyrics)
					.setLabel(lang.nowplaying_button_lyrics)
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(ended),
				new ButtonBuilder()
					.setCustomId(BUTTON.stop)
					.setEmoji(emojis.Player_Stop)
					.setLabel(lang.nowplaying_button_stop)
					.setStyle(ButtonStyle.Danger)
					.setDisabled(ended)
			)
		);

		return container;
	};

	/** The guild's player while it still has a track to show. */
	const livePlayer = (): Player | null => {
		const live = client.player.getPlayer(guildId);
		return live?.queue.current ? live : null;
	};

	const firstState = cardState(player);
	let lastCard = cardKey(firstState);
	const first = buildPanel(player);
	let lastPanel = JSON.stringify(first.toJSON());

	const response = await options.send({
		components: [first],
		files: [await renderCard(firstState)],
		flags: [MessageFlags.IsComponentsV2],
		allowedMentions: { parse: [] }
	});

	let finished = false;
	let updating: Promise<unknown> = Promise.resolve();

	// Edits are chained so a button press and a refresh never race. The card
	// is only re-rendered and re-uploaded when its content changed; the ended
	// state keeps the last card.
	const update = (): Promise<unknown> => {
		updating = updating.then(async () => {
			const live = finished ? null : livePlayer();
			if (live && !sameTrack(live.queue.current!, view.track)) {
				view = await loadTrackView(client, live.queue.current!);
				notes = [];
			}

			const panel = buildPanel(live);
			const serialized = JSON.stringify(panel.toJSON());
			const state = live ? cardState(live) : null;
			const cardChanged = !!state && cardKey(state) !== lastCard;
			if (!cardChanged && serialized === lastPanel) return;
			lastPanel = serialized;

			const files = cardChanged ? [await renderCard(state!)] : null;
			if (cardChanged) lastCard = cardKey(state!);
			await response
				.edit({
					components: [panel],
					...(files ? { files, attachments: [] } : {}),
					allowedMentions: { parse: [] }
				})
				.catch(() => finish());
		});
		return updating;
	};

	const collector = response.createMessageComponentCollector({
		componentType: ComponentType.Button,
		time: MAX_LIFETIME_MS
	});

	const refresh = setInterval(() => {
		if (!livePlayer()) return finish();
		void update();
	}, REFRESH_MS);

	function finish(): void {
		if (finished) return;
		finished = true;
		clearInterval(refresh);
		collector.stop();
		if (activePanels.get(guildId) === finish) activePanels.delete(guildId);
		void update();
	}

	activePanels.get(guildId)?.();
	activePanels.set(guildId, finish);
	collector.on("end", () => finish());

	const announce = (content: string) => {
		const live = client.player.getPlayer(guildId);
		const channel = client.guilds.cache
			.get(guildId)
			?.channels.cache.get(live?.textChannelId as string) as
			BaseGuildTextChannel | undefined;
		channel
			?.send({ content, allowedMentions: { parse: [] } })
			.catch(() => null);
	};

	const sendLyrics = async (i: ButtonInteraction) => {
		const { track, artwork, artworkName, accent } = view;
		await i.deferReply({ flags: [MessageFlags.Ephemeral] });

		const lyrics = await client.func.searchLyrics(track).catch(() => null);
		const content = lyrics?.res?.text?.trim();

		if (!content) {
			await i.editReply({ content: lang.nowplaying_lyrics_button });
			return;
		}

		const trimmed =
			content.length > LYRICS_MAX_LENGTH
				? `${content.substring(0, LYRICS_MAX_LENGTH)}...`
				: content;
		const footer = await client.func.displayBotName.footerBuilder(guildId);

		const container = new ContainerBuilder().setAccentColor(accent);
		const heading = new TextDisplayBuilder().setContent(
			`### ${trackTitle(track)}\n${escapeMarkdown(track.info.author || "")}`
		);
		if (artwork && artworkName) {
			container.addSectionComponents(
				new SectionBuilder()
					.addTextDisplayComponents(heading)
					.setThumbnailAccessory(
						new ThumbnailBuilder().setURL(
							`attachment://${artworkName}`
						)
					)
			);
		} else {
			container.addTextDisplayComponents(heading);
		}
		container
			.addSeparatorComponents(new SeparatorBuilder())
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(escapeMarkdown(trimmed)),
				new TextDisplayBuilder().setContent(
					`-# ${escapeMarkdown(footer.text)}`
				)
			);

		await i.editReply({
			components: [container],
			files:
				artwork && artworkName
					? [new AttachmentBuilder(artwork, { name: artworkName })]
					: [],
			flags: [MessageFlags.IsComponentsV2],
			allowedMentions: { parse: [] }
		});
	};

	collector.on("collect", async (i) => {
		try {
			if (i.customId === BUTTON.lyrics) {
				await sendLyrics(i);
				return;
			}

			const live = livePlayer();
			if (!live) {
				await i.reply({
					content: lang.nowplaying_no_queue,
					flags: [MessageFlags.Ephemeral]
				});
				finish();
				return;
			}

			// Same rule as the music commands: only listeners of the bot's
			// voice channel control the playback.
			const member = i.member as GuildMember | null;
			if (
				!member?.voice.channelId ||
				member.voice.channelId !== live.voiceChannelId
			) {
				await i.reply({
					content: lang.music_cannot,
					flags: [MessageFlags.Ephemeral]
				});
				return;
			}

			// The audio node is restarting: pause and skip wait for it (the
			// player comes back on its own), stop still works.
			if (
				!playerNodeReady(live) &&
				(i.customId === BUTTON.pause || i.customId === BUTTON.skip)
			) {
				await i.reply({
					content: lang.music_audio_unavailable,
					flags: [MessageFlags.Ephemeral]
				});
				return;
			}

			// Who controls what (musicControls.ts › musicRights): pause and
			// skip, the track playing's requester or a manager; loop and stop,
			// a manager.
			const rights = await musicRights(member, live);
			const current =
				i.customId === BUTTON.pause || i.customId === BUTTON.skip;
			if (current ? !rights.current : !rights.manager) {
				await i.reply({
					content: (current
						? lang.music_requester_only
						: lang.music_manager_only
					).replace("${emoji_No}", client.iHorizon_Emojis.No),
					flags: [MessageFlags.Ephemeral]
				});
				return;
			}

			await i.deferUpdate();
			const user = i.user.toString();

			switch (i.customId) {
				case BUTTON.pause:
					if (live.paused) {
						await live.resume();
						markPaused(live, false);
						announce(
							lang.nowplaying_resume_button.replace(
								"${author}",
								user
							)
						);
					} else {
						await live.pause();
						markPaused(live, true);
						announce(
							lang.nowplaying_pause_button.replace(
								"${author}",
								user
							)
						);
					}
					await update();
					break;
				case BUTTON.skip:
					announce(
						lang.nowplaying_skip_button.replace("${author}", user)
					);
					if (live.queue.tracks.length >= 1) {
						await crossfadeSkip(live);
						// The panel moves on to the next track.
						await update();
					} else {
						await live.stopPlaying();
						finish();
					}
					break;
				case BUTTON.loop: {
					const mode =
						NEXT_REPEAT_MODE[live.repeatMode as RepeatMode] ??
						"off";
					await live.setRepeatMode(mode);
					announce(
						lang.nowplaying_loop_button
							.replace("${author}", user)
							.replace("${mode}", loopLabel(mode))
					);
					await update();
					break;
				}
				case BUTTON.stop:
					await destroyPlayerSafely(live);
					announce(
						lang.nowplaying_stop_buttom.replace("${author}", user)
					);
					finish();
					break;
			}
		} catch (error) {
			logger.err(error);
		}
	});

	return response;
}
