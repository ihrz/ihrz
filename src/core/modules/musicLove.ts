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

/**
 * The Love button of the now playing panel: puts the track the panel shows
 * in the clicker's liked tracks (musicLibrary.ts, like the dashboard's
 * music.like), or, when it is already there, offers to remove it. Personal:
 * anyone who sees the panel may use it (no musicRights), every reply is
 * ephemeral, the blacklist is respected like the music commands.
 */

import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	Client,
	ComponentType,
	EmbedBuilder,
	MessageFlags,
	escapeMarkdown
} from "discord.js";
import type { Track, UnresolvedTrack } from "lavalink-client";

import type { LanguageData } from "../../../types/languageData.js";
import { blacklistTable } from "../database/tables.js";
import logger from "../logger.js";
import { hasErrorName } from "../functions/typeGuards.js";
import {
	favoriteKeys,
	MAX_FAVORITES,
	removeFavorite,
	setFavorite,
	toLibraryTrack
} from "./musicLibrary.js";
import { clip, loveAction } from "./musicLibraryView.js";

export const LOVE_BUTTON = "nowplaying_love";
export const LOVE_REMOVE_BUTTON = "nowplaying_love_remove";
const REMOVE_WINDOW_MS = 60_000;

/** The neutral heart of the panel (same for everyone). */
export function loveButton(
	lang: LanguageData,
	disabled: boolean,
	emojis: Pick<Client["iHorizon_Emojis"], "Player_Love">
) {
	return new ButtonBuilder()
		.setCustomId(LOVE_BUTTON)
		.setEmoji(emojis.Player_Love)
		.setLabel(lang.music_love_button)
		.setStyle(ButtonStyle.Secondary)
		.setDisabled(disabled);
}

/** Same refusal as the slash commands give to a blacklisted user. */
export async function replyIfBlacklisted(
	client: Client,
	i: ButtonInteraction
): Promise<boolean> {
	if (!(await blacklistTable.get(`${i.user.id}.blacklisted`))) return false;
	await i.reply({
		embeds: [
			new EmbedBuilder()
				.setColor("#0827F5")
				.setTitle(":(")
				.setImage(client.config.core.blacklistPictureInEmbed)
		],
		flags: [MessageFlags.Ephemeral]
	});
	return true;
}

export async function handleLoveClick(
	client: Client,
	lang: LanguageData,
	i: ButtonInteraction,
	track: Track | UnresolvedTrack | null | undefined
): Promise<void> {
	if (await replyIfBlacklisted(client, i)) return;
	const liked = lang.music_library_liked_name;
	const fill = (text: string, title: string) =>
		text
			.replaceAll("${track}", escapeMarkdown(clip(title || "?", 100)))
			.replaceAll("${playlist}", liked);
	const reply = (
		content: string,
		components: ActionRowBuilder<ButtonBuilder>[] = []
	) =>
		i.reply({
			content,
			components,
			flags: [MessageFlags.Ephemeral],
			allowedMentions: { parse: [] },
			withResponse: true
		});

	if (!track) {
		await reply(lang.nowplaying_no_queue);
		return;
	}
	const kept = toLibraryTrack(track);
	const user = i.user.id;
	const action = loveAction(
		kept?.key ?? null,
		kept ? (await favoriteKeys(user)).has(kept.key) : false
	);

	if (action === "unavailable") {
		await reply(fill(lang.music_love_unavailable, track.info?.title ?? ""));
		return;
	}

	if (action === "like") {
		try {
			await setFavorite(user, kept!, true);
		} catch (error) {
			if (!hasErrorName(error, "LibraryError")) throw error;
			await reply(
				lang.music_love_limit
					.replace("${playlist}", liked)
					.replace("${max}", String(MAX_FAVORITES))
			);
			return;
		}
		await reply(fill(lang.music_love_added, kept!.title));
		return;
	}

	// Already liked: a red button, for this user, for a minute.
	const removeRow = (disabled: boolean) =>
		new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId(LOVE_REMOVE_BUTTON)
				.setEmoji(client.iHorizon_Emojis.Player_Unlove)
				.setLabel(
					clip(
						lang.music_love_remove_button.replace(
							"${playlist}",
							liked
						),
						80
					)
				)
				.setStyle(ButtonStyle.Danger)
				.setDisabled(disabled)
		);
	const sent = await reply(fill(lang.music_love_already, kept!.title), [
		removeRow(false)
	]);
	const message = sent.resource?.message;
	if (!message) return;

	const collector = message.createMessageComponentCollector({
		componentType: ComponentType.Button,
		filter: (b) => b.user.id === user && b.customId === LOVE_REMOVE_BUTTON,
		time: REMOVE_WINDOW_MS,
		max: 1
	});
	collector.on("collect", async (b) => {
		try {
			try {
				await removeFavorite(user, kept!.key);
			} catch (error) {
				// Already removed elsewhere (dashboard): the outcome is the same.
				if (!hasErrorName(error, "LibraryError")) throw error;
			}
			await b.update({
				content: fill(lang.music_love_removed, kept!.title),
				components: [],
				allowedMentions: { parse: [] }
			});
		} catch (error) {
			logger.err(error);
		}
	});
	collector.on("end", (collected) => {
		if (collected.size) return;
		i.editReply({ components: [removeRow(true)] }).catch(() => null);
	});
}
