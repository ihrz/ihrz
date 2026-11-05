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
 * Queue panel (Components V2), the reply of /music queue.
 *
 * - Header: track count, time left and loop mode; the playing track as a
 *   section with its artwork; then the upcoming tracks, ten per page.
 * - Anyone can page through it and refresh it. Shuffle and "skip to"
 *   change the playback, so like the other music controls they are kept to
 *   listeners of the bot's voice channel.
 * - "Skip to" checks the chosen track is still at the same place (the queue
 *   may have moved since the page was drawn) before skipping to it.
 * - It reads the live player on every action, and switches to a disabled
 *   state when it expires or the player is gone.
 */

import { crossfadeSkip } from "./musicCrossfadeSkip.js";
import {
	ActionRowBuilder,
	BaseGuildTextChannel,
	ButtonBuilder,
	ButtonStyle,
	Client,
	ContainerBuilder,
	GuildMember,
	Message,
	MessageComponentInteraction,
	MessageFlags,
	SectionBuilder,
	SeparatorBuilder,
	SeparatorSpacingSize,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	TextDisplayBuilder,
	ThumbnailBuilder,
	User,
	escapeMarkdown
} from "discord.js";

import { LanguageData } from "../../../types/languageData.js";
import { NowPlayingPayload } from "./nowPlayingPanel.js";

type Player = NonNullable<ReturnType<Client["player"]["getPlayer"]>>;
type Track = NonNullable<Player["queue"]["current"]>;
type RepeatMode = "off" | "track" | "queue";

const PAGE_SIZE = 10;
const LIFETIME_MS = 5 * 60 * 1000;
const TITLE_MAX = 70;
const ACCENT = 0x6fa8dc;

const ID = {
	first: "queue_first",
	previous: "queue_previous",
	next: "queue_next",
	last: "queue_last",
	shuffle: "queue_shuffle",
	refresh: "queue_refresh",
	jump: "queue_jump"
} as const;

export interface QueuePanelOptions {
	client: Client;
	lang: LanguageData;
	guildId: string;
	/** Sends the panel message (a reply, an editReply...). */
	send: (payload: NowPlayingPayload) => Promise<Message>;
}

/** `m:ss`, or `h:mm:ss` past an hour. */
export function formatDuration(ms: number): string {
	const total = Math.max(0, Math.floor(ms / 1000));
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = String(total % 60).padStart(2, "0");
	return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

function clip(value: string, max: number): string {
	return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

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

function isLive(track: Track): boolean {
	return !!track.info.isStream || !track.info.duration;
}

function titleLink(track: Track): string {
	const title = `**${linkLabel(clip(track.info.title || "?", TITLE_MAX))}**`;
	const url = safeUrl(track.info.uri);
	return url ? `[${title}](${url})` : title;
}

function sameTrack(a: Track | undefined, identity: string): boolean {
	return !!a && (a.encoded ?? a.info.identifier) === identity;
}

/** Opens the queue panel; null when nothing plays. */
export async function openQueuePanel(
	options: QueuePanelOptions
): Promise<Message | null> {
	const { client, lang, guildId } = options;
	const emojis = client.iHorizon_Emojis;
	const player = client.player.getPlayer(guildId);
	if (!player?.queue.current) return null;

	let page = 0;
	let expired = false;
	// Identity of each track on the page as drawn, to check "skip to".
	let drawn: string[] = [];

	const live = (): Player | null => {
		const p = client.player.getPlayer(guildId);
		return p?.queue.current ? p : null;
	};

	const loopLabel = (mode: RepeatMode): string =>
		mode === "track"
			? lang.nowplaying_loop_track
			: mode === "queue"
				? lang.nowplaying_loop_queue
				: lang.nowplaying_loop_off;

	const trackLine = (track: Track, index: number): string => {
		const requester = track.requester as User | undefined;
		const meta = [
			escapeMarkdown(clip(track.info.author || "?", 60)),
			isLive(track)
				? lang.nowplaying_live
				: formatDuration(track.info.duration),
			requester?.id ? `<@${requester.id}>` : null
		].filter(Boolean);
		return `\`${String(index + 1).padStart(2, "0")}\` ${titleLink(track)}\n-# ${meta.join(" · ")}`;
	};

	const build = (p: Player | null): ContainerBuilder => {
		const tracks = p?.queue.tracks ?? [];
		const pages = Math.max(1, Math.ceil(tracks.length / PAGE_SIZE));
		page = Math.min(page, pages - 1);
		const start = page * PAGE_SIZE;
		const slice = tracks.slice(start, start + PAGE_SIZE) as Track[];
		drawn = slice.map((t) => t.encoded ?? t.info.identifier);
		const disabled = expired || !p;

		const container = new ContainerBuilder().setAccentColor(ACCENT);

		// Header: count, time left, loop mode.
		const current = p?.queue.current as Track | undefined;
		const remaining =
			current && !isLive(current)
				? Math.max(0, current.info.duration - (p?.position ?? 0))
				: 0;
		const left = tracks.reduce(
			(sum, t) => sum + (isLive(t as Track) ? 0 : (t.info.duration ?? 0)),
			remaining
		);
		const stats = [
			lang.nowplaying_queue_count.replace(
				"${count}",
				String(tracks.length)
			),
			lang.queue_time_left.replace("${duration}", formatDuration(left)),
			p ? loopLabel(p.repeatMode as RepeatMode) : null
		].filter(Boolean);
		container.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				`## ${emojis.Player_Queue} ${lang.queue_title}\n-# ${stats.join(" · ")}`
			)
		);

		// Now playing, with its artwork.
		if (current) {
			const position = isLive(current)
				? lang.nowplaying_live
				: `${formatDuration(Math.min(p!.position, current.info.duration))} / ${formatDuration(current.info.duration)}`;
			const state = p!.paused ? ` · ${lang.nowplaying_paused}` : "";
			const nowText = new TextDisplayBuilder().setContent(
				`-# ${emojis.Player_Listening} ${lang.queue_now_playing}\n${titleLink(current)}\n${escapeMarkdown(clip(current.info.author || "?", 80))}\n-# ${position}${state}`
			);
			const artwork = safeUrl(current.info.artworkUrl);
			if (artwork) {
				container.addSectionComponents(
					new SectionBuilder()
						.addTextDisplayComponents(nowText)
						.setThumbnailAccessory(
							new ThumbnailBuilder().setURL(artwork)
						)
				);
			} else {
				container.addTextDisplayComponents(nowText);
			}
		} else {
			container.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`-# ${emojis.Player_Stop} ${lang.nowplaying_ended}`
				)
			);
		}

		container.addSeparatorComponents(
			new SeparatorBuilder()
				.setDivider(true)
				.setSpacing(SeparatorSpacingSize.Large)
		);

		// Upcoming tracks.
		container.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				slice.length
					? `### ${lang.queue_up_next}\n${slice.map((t, i) => trackLine(t, start + i)).join("\n")}`
					: `-# ${lang.nowplaying_queue_end}`
			)
		);

		if (slice.length) {
			container.addActionRowComponents(
				new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
					new StringSelectMenuBuilder()
						.setCustomId(ID.jump)
						.setPlaceholder(lang.queue_jump_placeholder)
						.setDisabled(disabled)
						.addOptions(
							slice.map((t, i) =>
								new StringSelectMenuOptionBuilder()
									.setValue(String(start + i))
									.setLabel(
										clip(
											`${start + i + 1}. ${t.info.title || "?"}`,
											100
										)
									)
									.setDescription(
										clip(t.info.author || "?", 100)
									)
							)
						)
				)
			);
		}

		container.addSeparatorComponents(
			new SeparatorBuilder()
				.setDivider(false)
				.setSpacing(SeparatorSpacingSize.Small)
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
					.setCustomId(ID.first)
					.setLabel("<<")
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(disabled || page === 0),
				new ButtonBuilder()
					.setCustomId(ID.previous)
					.setLabel("<")
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(disabled || page === 0),
				new ButtonBuilder()
					.setCustomId(ID.next)
					.setLabel(">")
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(disabled || page >= pages - 1),
				new ButtonBuilder()
					.setCustomId(ID.last)
					.setLabel(">>")
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(disabled || page >= pages - 1)
			),
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId(ID.shuffle)
					.setLabel(lang.queue_button_shuffle)
					.setStyle(ButtonStyle.Primary)
					.setDisabled(disabled || tracks.length < 2),
				new ButtonBuilder()
					.setCustomId(ID.refresh)
					.setEmoji(emojis.Restore)
					.setLabel(lang.queue_button_refresh)
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(disabled)
			)
		);

		return container;
	};

	const payload = (p: Player | null) => ({
		components: [build(p)],
		flags: [MessageFlags.IsComponentsV2] as [MessageFlags.IsComponentsV2],
		allowedMentions: { parse: [] }
	});

	const response = await options.send(payload(player));

	const announce = (content: string) => {
		const p = client.player.getPlayer(guildId);
		const channel = client.guilds.cache
			.get(guildId)
			?.channels.cache.get(p?.textChannelId as string) as
			BaseGuildTextChannel | undefined;
		channel
			?.send({ content, allowedMentions: { parse: [] } })
			.catch(() => null);
	};

	/** Playback controls need the member in the bot's voice channel. */
	const canControl = async (
		i: MessageComponentInteraction,
		p: Player
	): Promise<boolean> => {
		const member = i.member as GuildMember | null;
		if (
			member?.voice.channelId &&
			member.voice.channelId === p.voiceChannelId
		)
			return true;
		await i.reply({
			content: lang.music_cannot.replace("${emoji_No}", emojis.No),
			flags: [MessageFlags.Ephemeral]
		});
		return false;
	};

	const collector = response.createMessageComponentCollector({
		time: LIFETIME_MS
	});

	collector.on("collect", async (i) => {
		try {
			const p = live();
			if (!p) {
				collector.stop();
				await i.update(payload(null));
				return;
			}
			const pages = Math.max(
				1,
				Math.ceil(p.queue.tracks.length / PAGE_SIZE)
			);
			const user = i.user.toString();

			switch (i.customId) {
				case ID.first:
					page = 0;
					break;
				case ID.previous:
					page = Math.max(0, page - 1);
					break;
				case ID.next:
					page = Math.min(pages - 1, page + 1);
					break;
				case ID.last:
					page = pages - 1;
					break;
				case ID.refresh:
					break;
				case ID.shuffle:
					if (!(await canControl(i, p))) return;
					await p.queue.shuffle();
					page = 0;
					announce(lang.queue_shuffled.replace("${author}", user));
					break;
				case ID.jump: {
					if (!i.isStringSelectMenu()) return;
					if (!(await canControl(i, p))) return;
					const index = Number(i.values[0]);
					const target = p.queue.tracks[index] as Track | undefined;
					const identity = drawn[index - page * PAGE_SIZE];
					if (
						!Number.isInteger(index) ||
						!sameTrack(target, identity)
					) {
						// The queue moved since this page was drawn.
						await i.update(payload(p));
						return;
					}
					await crossfadeSkip(p, index + 1);
					page = 0;
					announce(
						lang.queue_jumped
							.replace("${author}", user)
							.replace(
								"${track}",
								`**${escapeMarkdown(clip(target!.info.title || "?", TITLE_MAX))}**`
							)
					);
					// The player swaps tracks asynchronously; draw after it.
					await new Promise((r) => setTimeout(r, 400));
					break;
				}
				default:
					return;
			}
			await i.update(payload(live()));
		} catch (error) {
			logger.err(error);
		}
	});

	collector.on("end", () => {
		expired = true;
		response.edit(payload(live())).catch(() => null);
	});

	return response;
}
