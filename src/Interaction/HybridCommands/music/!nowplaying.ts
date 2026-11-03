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
 * with resvg. The artwork is downloaded once; refreshes re-render the card
 * only when its time or pause state changed and skip the edit when nothing
 * visible changed. The panel follows one track: it
 * switches to its ended state when the track changes or the player is gone.
 */

import {
	ActionRowBuilder,
	AttachmentBuilder,
	BaseGuildTextChannel,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	ChatInputCommandInteraction,
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

import { LanguageData } from "../../../../types/languageData.js";

import { SubCommand } from "../../../../types/command.js";
import {
	loadArtwork,
	renderNowPlaying
} from "../../../core/modules/musicCards.js";

type Player = NonNullable<ReturnType<Client["player"]["getPlayer"]>>;
type Track = NonNullable<Player["queue"]["current"]>;
type RepeatMode = "off" | "track" | "queue";

// Close to the old card refresh; stays under the per-channel edit limit.
const REFRESH_MS = 6_000;
// Streams have no duration: the panel stops refreshing after this.
const MAX_LIFETIME_MS = 3 * 60 * 60 * 1000;
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

/** Markdown link label: escaped, brackets included. */
function linkLabel(value: string): string {
	return escapeMarkdown(value).replace(/[[\]]/g, "\\$&");
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

		const guildId = interaction.guild.id;
		const player = client.player.getPlayer(guildId);
		const voiceChannel = (interaction.member as GuildMember).voice.channel;
		const track = player?.queue.current;

		if (!player || !player.playing || !voiceChannel || !track) {
			await client.func.method.interactionSend(interaction, {
				content: lang.nowplaying_no_queue
			});
			return;
		}

		const emojis = client.iHorizon_Emojis;
		const artwork = await loadArtwork(track.info.artworkUrl).catch(
			() => null
		);
		const artworkName = artwork ? artworkFileName(artwork) : null;

		const colors = artwork
			? await client.func.image_dominant_color(artwork).catch(() => null)
			: null;
		const parsedAccent = colors
			? parseInt(colors.color1.replace("#", ""), 16)
			: NaN;
		const accent = Number.isFinite(parsedAccent)
			? parsedAccent
			: DEFAULT_ACCENT;
		const isLive = !!track.info.isStream || !track.info.duration;
		const trackUrl = safeUrl(track.info.uri);

		const loopLabel = (mode: RepeatMode): string =>
			mode === "track"
				? lang.nowplaying_loop_track
				: mode === "queue"
					? lang.nowplaying_loop_queue
					: lang.nowplaying_loop_off;

		/** What the player card shows; the card is re-rendered when it changes. */
		const cardState = (live: Player) => {
			const position = isLive
				? 0
				: Math.min(live.position, track.info.duration);
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
			`${state.currentTime}|${state.paused}`;

		const renderCard = async (
			state: ReturnType<typeof cardState>
		): Promise<AttachmentBuilder> =>
			new AttachmentBuilder(
				await renderNowPlaying({
					title: track.info.title || "?",
					author: track.info.author || "",
					artwork,
					colorStart: colors?.color1 ?? "#5865F2",
					colorEnd: colors?.color2 ?? "#1e1f22",
					...state,
					liveLabel: isLive ? lang.nowplaying_live : undefined
				}),
				{ name: CARD_NAME }
			);

		const detailsLines = (live: Player): string[] => {
			const lines: string[] = [];
			const requester = track.requester as User | undefined;
			if (requester?.id) {
				lines.push(
					`${emojis.Headphone} ${lang.nowplaying_requested_by.replace(
						"${user}",
						`<@${requester.id}>`
					)}`
				);
			}

			const next = live.queue.tracks[0];
			lines.push(
				next
					? `${emojis.Pages} ${lang.nowplaying_up_next.replace(
							"${track}",
							`**${escapeMarkdown(next.info.title || "?")}**`
						)}`
					: `${emojis.Pages} ${lang.nowplaying_queue_end}`
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
			return lines;
		};

		const buildPanel = (live: Player | null): ContainerBuilder => {
			const ended = !live;
			const container = new ContainerBuilder().setAccentColor(accent);

			container.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`-# ${emojis.Voice_Channel} ${lang.nowplaying_header.replace(
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
					: `-# ${emojis.Music_Stop} ${lang.nowplaying_ended}`
			);
			if (trackUrl) {
				container.addSectionComponents(
					new SectionBuilder()
						.addTextDisplayComponents(details)
						.setButtonAccessory(
							new ButtonBuilder()
								.setStyle(ButtonStyle.Link)
								.setURL(trackUrl)
								.setLabel(lang.nowplaying_button_open)
						)
				);
			} else {
				container.addTextDisplayComponents(details);
			}

			const paused = !!live?.paused;
			container.addActionRowComponents(
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setCustomId(BUTTON.pause)
						.setEmoji(paused ? emojis.Music_Icon : emojis.Pause)
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
						.setEmoji(emojis.Zap)
						.setLabel(lang.nowplaying_button_skip)
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(ended),
					new ButtonBuilder()
						.setCustomId(BUTTON.loop)
						.setEmoji(emojis.Restore)
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
						.setEmoji(emojis.Paper)
						.setLabel(lang.nowplaying_button_lyrics)
						.setStyle(ButtonStyle.Secondary),
					new ButtonBuilder()
						.setCustomId(BUTTON.stop)
						.setEmoji(emojis.Music_Stop)
						.setLabel(lang.nowplaying_button_stop)
						.setStyle(ButtonStyle.Danger)
						.setDisabled(ended)
				)
			);

			return container;
		};

		/** The player while it still plays the track of this panel. */
		const livePlayer = (): Player | null => {
			const live = client.player.getPlayer(guildId);
			const current = live?.queue.current;
			return live &&
				current &&
				current.info.identifier === track.info.identifier
				? live
				: null;
		};

		const firstState = cardState(player);
		let lastCard = cardKey(firstState);
		const first = buildPanel(player);
		let lastPanel = JSON.stringify(first.toJSON());

		const response = await client.func.method.interactionSend(interaction, {
			components: [first],
			files: [await renderCard(firstState)],
			flags: [MessageFlags.IsComponentsV2],
			allowedMentions: { parse: [] }
		});

		let finished = false;
		let updating: Promise<unknown> = Promise.resolve();

		// Edits are chained so a button press and a refresh never race. The
		// card is only re-rendered and re-uploaded when its content changed;
		// the ended state keeps the last card.
		const update = (live: Player | null): Promise<unknown> => {
			updating = updating.then(async () => {
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
			const live = livePlayer();
			if (!live) return finish();
			void update(live);
		}, REFRESH_MS);

		function finish(): void {
			if (finished) return;
			finished = true;
			clearInterval(refresh);
			collector.stop();
			void update(null);
		}

		collector.on("end", () => finish());

		const announce = (content: string) => {
			const channel = interaction.guild!.channels.cache.get(
				player.textChannelId as string
			) as BaseGuildTextChannel | undefined;
			channel
				?.send({ content, allowedMentions: { parse: [] } })
				.catch(() => null);
		};

		const sendLyrics = async (i: ButtonInteraction) => {
			await i.deferReply({ flags: [MessageFlags.Ephemeral] });

			const lyrics = await client.func
				.searchLyrics(`${track.info.title} - ${track.info.author}`)
				.catch(() => null);
			const content = lyrics?.res?.text?.trim();

			if (!content) {
				await i.editReply({ content: lang.nowplaying_lyrics_button });
				return;
			}

			const trimmed =
				content.length > LYRICS_MAX_LENGTH
					? `${content.substring(0, LYRICS_MAX_LENGTH)}...`
					: content;
			const footer =
				await client.func.displayBotName.footerBuilder(guildId);

			const container = new ContainerBuilder().setAccentColor(accent);
			const heading = new TextDisplayBuilder().setContent(
				`### ${trackTitle(track)}\n${escapeMarkdown(
					track.info.author || ""
				)}`
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
					new TextDisplayBuilder().setContent(
						escapeMarkdown(trimmed)
					),
					new TextDisplayBuilder().setContent(
						`-# ${escapeMarkdown(footer.text)}`
					)
				);

			await i.editReply({
				components: [container],
				files: artwork
					? [new AttachmentBuilder(artwork, { name: artworkName! })]
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

				// Same rule as the music commands: only listeners of the
				// bot's voice channel control the playback.
				const member = i.member as GuildMember | null;
				if (
					!member?.voice.channelId ||
					member.voice.channelId !== live.voiceChannelId
				) {
					await i.reply({
						content: lang.music_cannot.replace(
							"${emoji_No}",
							emojis.No
						),
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
							announce(
								lang.nowplaying_resume_button.replace(
									"${author}",
									user
								)
							);
						} else {
							await live.pause();
							announce(
								lang.nowplaying_pause_button.replace(
									"${author}",
									user
								)
							);
						}
						await update(live);
						break;
					case BUTTON.skip:
						if (live.queue.tracks.length >= 1) await live.skip();
						else await live.stopPlaying();
						announce(
							lang.nowplaying_skip_button.replace(
								"${author}",
								user
							)
						);
						finish();
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
						await update(live);
						break;
					}
					case BUTTON.stop:
						await live.destroy();
						announce(
							lang.nowplaying_stop_buttom.replace(
								"${author}",
								user
							)
						);
						finish();
						break;
				}
			} catch (error) {
				logger.err(error);
			}
		});
	}
};
