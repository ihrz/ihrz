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
	AttachmentBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	ChatInputCommandInteraction,
	Client,
	ContainerBuilder,
	MediaGalleryBuilder,
	MediaGalleryItemBuilder,
	Message,
	MessageFlags,
	PermissionFlagsBits,
	SectionBuilder,
	SeparatorBuilder,
	SeparatorSpacingSize,
	TextDisplayBuilder,
	ThumbnailBuilder,
	escapeMarkdown
} from "discord.js";

import { DatabaseStructure } from "../../../../types/database_structure.js";
import { LanguageData } from "../../../../types/languageData.js";
import { SubCommand } from "../../../../types/command.js";
import { loadArtwork } from "../../../core/modules/musicCards.js";
import {
	StoredHistory,
	exportText,
	formatListeningTime,
	formatTrackDuration,
	newestFirst,
	pageCount,
	pageOf,
	pruneHistory,
	recentArtworks,
	safeHttpUrl,
	summarize
} from "../../../core/modules/musicHistoryView.js";
import { SOURCES } from "../../../core/modules/nowPlayingPanel.js";

type Track = DatabaseStructure.MusicHistoryTrack;
type View = "list" | "confirm" | "ended";

const DEFAULT_ACCENT = 0x6fa8dc;
const COLLECTOR_MS = 15 * 60 * 1000;
// Entries recorded before track details were kept: plain lines.
const LEGACY_PAGE_SIZE = 10;

const ID = {
	previous: "music_history_previous",
	next: "music_history_next",
	export: "music_history_export",
	clear: "music_history_clear",
	confirm: "music_history_confirm",
	cancel: "music_history_cancel"
} as const;

/** Markdown link label: escaped, brackets included. */
function linkLabel(value: string): string {
	return escapeMarkdown(value).replaceAll("[", "\\[").replaceAll("]", "\\]");
}

// /music history: what this server played over the last 30 days, as a
// Components V2 card: highlights, the recent artworks, then the plays page by
// page with their artwork, source, requester and time.
export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData
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
		const authorId =
			interaction instanceof Message
				? interaction.author.id
				: interaction.user.id;
		const emojis = client.iHorizon_Emojis as unknown as Record<
			string,
			string
		>;
		const path = `${guild.id}.MUSIC_HISTORY`;

		const stored = (await client.db.get(path)) as StoredHistory | null;
		const { history, changed } = pruneHistory(stored, Date.now());
		if (changed) await client.db.set(path, history);

		const tracks: Track[] = newestFirst(history.tracks ?? []);
		const legacy = [...(history.embed ?? [])].reverse();
		if (tracks.length === 0 && legacy.length === 0) {
			await client.func.method.interactionSend(interaction, {
				content: lang.history_no_entries
			});
			return;
		}

		const summary = summarize(tracks);
		const pages =
			tracks.length > 0
				? pageCount(tracks.length)
				: pageCount(legacy.length, LEGACY_PAGE_SIZE);
		const artworks = recentArtworks(tracks);

		// The card takes the colour of the latest artwork, like the player.
		let accent = DEFAULT_ACCENT;
		const latestArt = await loadArtwork(artworks[0]).catch(() => null);
		if (latestArt) {
			const colors = await client.func
				.image_dominant_color(latestArt)
				.catch(() => null);
			const parsed = colors
				? parseInt(colors.color1.replace("#", ""), 16)
				: NaN;
			if (Number.isFinite(parsed)) accent = parsed;
		}

		const sourceLabel = (key: string | null): string | null => {
			if (!key) return null;
			const source = SOURCES[key.toLowerCase()] ?? {
				name: key.charAt(0).toUpperCase() + key.slice(1)
			};
			const emoji = source.emoji ? emojis[source.emoji] : undefined;
			return `${emoji ? `${emoji} ` : ""}${source.name}`;
		};

		const entry = (t: Track): SectionBuilder | TextDisplayBuilder => {
			const url = safeHttpUrl(t.uri);
			const title = linkLabel(t.title || "?");
			const heading = url ? `**[${title}](${url})**` : `**${title}**`;
			const duration = formatTrackDuration(t.duration);
			const second = [
				t.author ? escapeMarkdown(t.author) : null,
				duration ? `\`${duration}\`` : lang.nowplaying_live
			]
				.filter(Boolean)
				.join(" · ");
			const meta = [
				sourceLabel(t.source),
				t.requesterId
					? `${emojis.Player_Headphones} <@${t.requesterId}>`
					: null,
				`<t:${Math.floor(t.at / 1000)}:R>`
			]
				.filter(Boolean)
				.join(" · ");
			const text = new TextDisplayBuilder().setContent(
				`${heading}\n${second}\n-# ${meta}`
			);
			const art = safeHttpUrl(t.artworkUrl);
			return art
				? new SectionBuilder()
						.addTextDisplayComponents(text)
						.setThumbnailAccessory(
							new ThumbnailBuilder()
								.setURL(art)
								.setDescription(
									(t.title || "artwork").slice(0, 100)
								)
						)
				: text;
		};

		const header = (): string => {
			const lines = [
				`## ${emojis.Player_Queue} ${lang.history_title.replace(
					"${guild}",
					escapeMarkdown(guild.name)
				)}`
			];
			if (tracks.length > 0) {
				lines.push(
					`-# ${emojis.Stats} ${lang.history_summary
						.replace("${count}", String(summary.count))
						.replace(
							"${duration}",
							formatListeningTime(summary.totalMs)
						)}`
				);
				if (summary.topArtist) {
					lines.push(
						`${emojis.Music_Icon} ${lang.history_top_artist
							.replace(
								"${artist}",
								escapeMarkdown(summary.topArtist.name)
							)
							.replace(
								"${count}",
								String(summary.topArtist.count)
							)}`
					);
				}
				if (summary.topRequester) {
					lines.push(
						`${emojis.Player_Headphones} ${lang.history_top_listener
							.replace("${user}", `<@${summary.topRequester.id}>`)
							.replace(
								"${count}",
								String(summary.topRequester.count)
							)}`
					);
				}
			}
			return lines.join("\n");
		};

		const build = (page: number, view: View): ContainerBuilder => {
			const container = new ContainerBuilder().setAccentColor(accent);
			const icon = guild.iconURL({ size: 128 });
			const head = new TextDisplayBuilder().setContent(header());
			if (icon) {
				container.addSectionComponents(
					new SectionBuilder()
						.addTextDisplayComponents(head)
						.setThumbnailAccessory(
							new ThumbnailBuilder().setURL(icon)
						)
				);
			} else {
				container.addTextDisplayComponents(head);
			}

			if (page === 0 && artworks.length >= 2) {
				container.addMediaGalleryComponents(
					new MediaGalleryBuilder().addItems(
						artworks.map((url) =>
							new MediaGalleryItemBuilder().setURL(url)
						)
					)
				);
			}

			container.addSeparatorComponents(
				new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
			);

			if (tracks.length > 0) {
				for (const t of pageOf(tracks, page)) {
					const part = entry(t);
					if (part instanceof SectionBuilder) {
						container.addSectionComponents(part);
					} else {
						container.addTextDisplayComponents(part);
					}
				}
			} else {
				const lines = pageOf(legacy, page, LEGACY_PAGE_SIZE);
				container.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`-# ${lang.history_legacy_note}\n${lines.join("\n")}`
					)
				);
			}

			container.addSeparatorComponents(new SeparatorBuilder());

			if (view === "confirm") {
				container.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						lang.history_clear_confirm.replace(
							"${emoji}",
							emojis.Warning_Icon
						)
					)
				);
				container.addActionRowComponents(
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setCustomId(ID.confirm)
							.setEmoji(emojis.Ticket_Trash)
							.setLabel(lang.history_button_confirm_clear)
							.setStyle(ButtonStyle.Danger),
						new ButtonBuilder()
							.setCustomId(ID.cancel)
							.setLabel(lang.history_button_cancel)
							.setStyle(ButtonStyle.Secondary)
					)
				);
				return container;
			}

			container.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`-# ${emojis.Pages} ${lang.history_page
						.replace("${page}", String(page + 1))
						.replace("${pages}", String(pages))} · ${
						emojis.Timer
					} ${lang.history_kept}`
				)
			);
			const ended = view === "ended";
			container.addActionRowComponents(
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setCustomId(ID.previous)
						.setEmoji("◀️")
						.setLabel(lang.history_button_previous)
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(ended || pages < 2),
					new ButtonBuilder()
						.setCustomId(ID.next)
						.setEmoji("▶️")
						.setLabel(lang.history_button_next)
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(ended || pages < 2),
					new ButtonBuilder()
						.setCustomId(ID.export)
						.setEmoji(emojis.Save_Clip)
						.setLabel(lang.history_button_export)
						.setStyle(ButtonStyle.Primary)
						.setDisabled(ended),
					new ButtonBuilder()
						.setCustomId(ID.clear)
						.setEmoji(emojis.Ticket_Trash)
						.setLabel(lang.history_button_clear)
						.setStyle(ButtonStyle.Danger)
						.setDisabled(ended)
				)
			);
			return container;
		};

		const cleared = (): ContainerBuilder =>
			new ContainerBuilder()
				.setAccentColor(accent)
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						lang.history_cleared.replace("${emoji}", emojis.Yes)
					)
				);

		let page = 0;
		const message = await client.func.method.interactionSend(interaction, {
			components: [build(page, "list")],
			flags: [MessageFlags.IsComponentsV2],
			allowedMentions: { parse: [] }
		});

		const canClear = async (i: ButtonInteraction): Promise<boolean> =>
			!!i.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ||
			(await client.func.ownerHelper.isBotOwner(i.user.id));

		const collector = message.createMessageComponentCollector({
			time: COLLECTOR_MS
		});

		collector.on("collect", async (i) => {
			if (!i.isButton()) return;
			if (i.user.id !== authorId) {
				await i.reply({
					content: lang.history_not_yours.replace(
						"${emoji}",
						emojis.No
					),
					flags: [MessageFlags.Ephemeral]
				});
				return;
			}
			switch (i.customId) {
				case ID.previous:
					page = (page - 1 + pages) % pages;
					await i.update({ components: [build(page, "list")] });
					break;
				case ID.next:
					page = (page + 1) % pages;
					await i.update({ components: [build(page, "list")] });
					break;
				case ID.export: {
					const text =
						tracks.length > 0
							? exportText(
									guild.name,
									tracks,
									(id) =>
										client.users.cache.get(id)?.username ??
										null
								)
							: [...(history.buffer ?? [])].join("\n") + "\n";
					await i.reply({
						content: lang.history_export_ready.replace(
							"${emoji}",
							emojis.Save_Clip
						),
						files: [
							new AttachmentBuilder(Buffer.from(text, "utf-8"), {
								name: `music-history-${guild.id}.txt`
							})
						],
						flags: [MessageFlags.Ephemeral]
					});
					break;
				}
				case ID.clear:
					if (!(await canClear(i))) {
						await i.reply({
							content: lang.history_clear_forbidden.replace(
								"${emoji}",
								emojis.No
							),
							flags: [MessageFlags.Ephemeral]
						});
						return;
					}
					await i.update({ components: [build(page, "confirm")] });
					break;
				case ID.confirm:
					if (!(await canClear(i))) return;
					await client.db.delete(path);
					await i.update({ components: [cleared()] });
					collector.stop("cleared");
					break;
				case ID.cancel:
					await i.update({ components: [build(page, "list")] });
					break;
			}
		});

		collector.on("end", (_collected, reason) => {
			if (reason === "cleared") return;
			message
				.edit({
					components: [build(page, "ended")],
					flags: [MessageFlags.IsComponentsV2],
					allowedMentions: { parse: [] }
				})
				.catch(() => undefined);
		});
	}
};
