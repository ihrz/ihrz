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
	ContainerBuilder,
	User,
	escapeMarkdown
} from "discord.js";

import { LanguageData } from "../../../types/languageData.js";
import { buildCard } from "./uiCard.js";

/** Last.fm's red, the colour of the category. */
export const LASTFM_ACCENT = 0xba0000;

export const LASTFM_PERIODS = [
	"7day",
	"1month",
	"3month",
	"6month",
	"12month",
	"overall"
] as const;
export type LastFMPeriod = (typeof LASTFM_PERIODS)[number];

/** How many entries each list of the overview shows. */
const TOP_SIZE = 5;

type LFMImage = { size?: string; "#text"?: string };
type LFMText = { "#text"?: string; name?: string };

/** Last.fm's grey star stands for "no image". */
const PLACEHOLDER = "2a96cbd8b46e442fc41c2b86b821562f";

export function lastfmImage(images: LFMImage[] | undefined): string | null {
	const byQuality = ["extralarge", "large", "medium", "small"];
	for (const size of byQuality) {
		const url = images?.find((i) => i.size === size)?.["#text"];
		if (url && !url.includes(PLACEHOLDER)) return url;
	}
	return null;
}

/** Last.fm answers a single item as an object, several as an array. */
export function asList<T>(value: T | T[] | undefined): T[] {
	if (value === undefined || value === null) return [];
	return Array.isArray(value) ? value : [value];
}

/** A markdown link whose URL can't close the link early. */
export function mdLink(label: string, url: string | undefined): string {
	// escapeMarkdown leaves brackets alone: a "]" would close the label.
	const safe = escapeMarkdown(label).replace(/[[\]]/g, "\\$&");
	if (!url || !/^https:\/\//.test(url)) return safe;
	return `[${safe}](${url.replace(/\(/g, "%28").replace(/\)/g, "%29")})`;
}

export const formatCount = (value: string | number | undefined): string =>
	Number(value ?? 0).toLocaleString("en-US");

export const profileUrl = (username: string) =>
	`https://www.last.fm/user/${encodeURIComponent(username)}`;

function periodLabel(lang: LanguageData, period: LastFMPeriod): string {
	return lang[`lastfm_period_${period}`];
}

export function profileButton(
	lang: LanguageData,
	username: string
): ActionRowBuilder<ButtonBuilder> {
	return new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setStyle(ButtonStyle.Link)
			.setLabel(lang.lastfm_button_profile)
			.setURL(profileUrl(username))
	);
}

interface LFMUserInfo {
	user?: {
		name?: string;
		realname?: string;
		url?: string;
		country?: string;
		playcount?: string;
		artist_count?: string;
		track_count?: string;
		album_count?: string;
		registered?: { unixtime?: string | number };
		image?: LFMImage[];
	};
}

/** The status of a member's Last.fm link (/lastfm status, config, login). */
export async function lastfmStatusCard(
	user: User,
	guildId: string | null,
	lang: LanguageData,
	intro?: string
): Promise<ContainerBuilder> {
	const manager = user.client.lastFMScrobbler;
	const settings = await manager.getUserSettings(user.id);
	const username = settings?.sessionKey ? settings.username : undefined;

	if (!username) {
		return buildCard({
			accent: LASTFM_ACCENT,
			title: lang.lastfm_card_title.replace("${user}", user.displayName),
			description: [intro, lang.lastfm_status_not_linked]
				.filter(Boolean)
				.join("\n\n"),
			thumbnail: user.displayAvatarURL({ size: 256 })
		});
	}

	const info = await manager.read<LFMUserInfo>("user.getInfo", {
		user: username
	});
	const profile = info.ok ? info.data?.user : undefined;
	const now = guildId ? manager.listening(user.id, guildId) : null;

	const nowBlock = now
		? [
				lang.lastfm_status_now_title,
				lang.lastfm_track_line
					.replace("${title}", escapeMarkdown(now.title))
					.replace("${artist}", escapeMarkdown(now.artist)),
				`-# ${
					now.scrobbled
						? lang.lastfm_status_now_scrobbled
						: now.tooShort
							? lang.lastfm_status_now_short
							: now.paused || now.scrobbleAt === null
								? lang.lastfm_status_now_paused
								: lang.lastfm_status_now_pending.replace(
										"${when}",
										`<t:${Math.floor(now.scrobbleAt / 1000)}:R>`
									)
				}`
			].join("\n")
		: null;

	const card = buildCard({
		accent: LASTFM_ACCENT,
		title: lang.lastfm_card_title.replace("${user}", user.displayName),
		description: intro ?? null,
		thumbnail:
			lastfmImage(profile?.image) ?? user.displayAvatarURL({ size: 256 }),
		fields: [
			{
				label: lang.lastfm_field_account,
				emoji: client.iHorizon_Emojis.LastFM_Account,
				value: mdLink(username, profileUrl(username))
			},
			{
				label: lang.lastfm_field_scrobbling,
				emoji: client.iHorizon_Emojis.Player_Listening,
				value: settings?.enabled
					? lang.lastfm_scrobbling_on
					: lang.lastfm_scrobbling_off
			},
			profile?.playcount !== undefined && {
				label: lang.lastfm_field_scrobbles,
				emoji: client.iHorizon_Emojis.LastFM_Scrobbles,
				value: formatCount(profile.playcount)
			},
			settings?.connectedAt
				? {
						label: lang.lastfm_field_linked,
						emoji: client.iHorizon_Emojis.LastFM_Calendar,
						value: `<t:${Math.floor(settings.connectedAt / 1000)}:D>`
					}
				: null
		],
		blocks: [nowBlock],
		footer: lang.lastfm_status_how
	});
	card.addActionRowComponents(profileButton(lang, username));
	return card;
}

interface LFMRecent {
	recenttracks?: {
		track?:
			| {
					name?: string;
					url?: string;
					artist?: LFMText;
					date?: { uts?: string };
					"@attr"?: { nowplaying?: string };
			  }[]
			| object;
	};
}
interface LFMTop<K extends string> {
	[key: string]:
		| {
				[k in K]?:
					| {
							name?: string;
							url?: string;
							playcount?: string;
							artist?: LFMText;
							image?: LFMImage[];
					  }[]
					| object;
		  }
		| undefined;
}

/**
 * A Last.fm profile at a glance: its figures, what it plays now (or played
 * last), and its top artists, tracks and albums over `period`, album covers
 * in a gallery. Null when the account can't be read.
 */
export async function lastfmOverviewCard(
	username: string,
	label: string,
	period: LastFMPeriod,
	lang: LanguageData
): Promise<ContainerBuilder | null> {
	const manager = client.lastFMScrobbler;
	const top = (method: string) =>
		manager.read<LFMTop<string>>(method, {
			user: username,
			period,
			limit: String(TOP_SIZE)
		});
	const [info, recent, artists, tracks, albums] = await Promise.all([
		manager.read<LFMUserInfo>("user.getInfo", { user: username }),
		manager.read<LFMRecent>("user.getRecentTracks", {
			user: username,
			limit: String(TOP_SIZE)
		}),
		top("user.getTopArtists"),
		top("user.getTopTracks"),
		top("user.getTopAlbums")
	]);
	const profile = info.ok ? info.data?.user : undefined;
	if (!profile) return null;

	const name = profile.realname || profile.name || username;
	const registered = Number(profile.registered?.unixtime ?? 0);
	const period$ = periodLabel(lang, period);
	const hidden = (r: { ok: boolean; errorCode?: number }) =>
		!r.ok && r.errorCode === 17;

	// What it plays now, else its last tracks.
	const recentTracks = asList(
		recent.data?.recenttracks?.track as
			NonNullable<LFMRecent["recenttracks"]>["track"] | undefined
	) as {
		name?: string;
		url?: string;
		artist?: LFMText;
		date?: { uts?: string };
		"@attr"?: { nowplaying?: string };
	}[];
	const playing = recentTracks.find((t) => t["@attr"]?.nowplaying === "true");
	const recentLines = recentTracks
		.filter((t) => t !== playing)
		.slice(0, TOP_SIZE)
		.map(
			(t) =>
				`${lang.lastfm_track_line
					.replace("${title}", mdLink(t.name ?? "?", t.url))
					.replace(
						"${artist}",
						escapeMarkdown(
							t.artist?.["#text"] ?? t.artist?.name ?? "?"
						)
					)}${t.date?.uts ? ` · <t:${t.date.uts}:R>` : ""}`
		);
	const listening = hidden(recent)
		? `${lang.lastfm_overview_recent}\n-# ${lang.lastfm_overview_private}`
		: [
				playing
					? `${lang.lastfm_overview_now}\n${lang.lastfm_track_line
							.replace(
								"${title}",
								`**${mdLink(playing.name ?? "?", playing.url)}**`
							)
							.replace(
								"${artist}",
								escapeMarkdown(
									playing.artist?.["#text"] ??
										playing.artist?.name ??
										"?"
								)
							)}`
					: null,
				`${lang.lastfm_overview_recent}\n${recentLines.join("\n") || `-# ${lang.lastfm_overview_empty}`}`
			]
				.filter(Boolean)
				.join("\n\n");

	const ranking = (
		response: Awaited<ReturnType<typeof top>>,
		root: string,
		item: string,
		title: string,
		withArtist: boolean
	): string => {
		const entries = asList(
			response.data?.[root]?.[item] as
				| {
						name?: string;
						url?: string;
						playcount?: string;
						artist?: LFMText;
				  }[]
				| undefined
		).slice(0, TOP_SIZE);
		const heading = title.replace("${period}", period$);
		if (hidden(response))
			return `${heading}\n-# ${lang.lastfm_overview_private}`;
		if (entries.length === 0)
			return `${heading}\n-# ${lang.lastfm_overview_empty}`;
		return `${heading}\n${entries
			.map(
				(e, i) =>
					`\`${i + 1}\` ${mdLink(e.name ?? "?", e.url)}${
						withArtist && (e.artist?.name || e.artist?.["#text"])
							? ` · ${escapeMarkdown(e.artist?.name ?? e.artist?.["#text"] ?? "")}`
							: ""
					} · ${lang.lastfm_overview_plays.replace("${count}", formatCount(e.playcount))}`
			)
			.join("\n")}`;
	};

	const albumCovers = asList(
		albums.data?.topalbums?.album as { image?: LFMImage[] }[] | undefined
	)
		.map((a) => lastfmImage(a.image))
		.filter((url): url is string => !!url)
		.slice(0, 5);

	const card = buildCard({
		accent: LASTFM_ACCENT,
		title: lang.lastfm_overview_title.replace(
			"${name}",
			escapeMarkdown(name)
		),
		description: [
			lang.lastfm_overview_subtitle
				.replace("${user}", label)
				.replace(
					"${account}",
					mdLink(
						profile.name ?? username,
						profile.url ?? profileUrl(username)
					)
				),
			[
				profile.country && profile.country !== "None"
					? lang.lastfm_overview_country.replace(
							"${country}",
							escapeMarkdown(profile.country)
						)
					: null,
				registered
					? lang.lastfm_overview_since.replace(
							"${date}",
							`<t:${registered}:D>`
						)
					: null
			]
				.filter(Boolean)
				.join(" · ")
		]
			.filter(Boolean)
			.join("\n"),
		thumbnail: lastfmImage(profile.image),
		fields: [
			{
				label: lang.lastfm_field_scrobbles,
				emoji: client.iHorizon_Emojis.LastFM_Scrobbles,
				value: formatCount(profile.playcount)
			},
			{
				label: lang.lastfm_field_artists,
				emoji: client.iHorizon_Emojis.Micro,
				value: formatCount(profile.artist_count)
			},
			{
				label: lang.lastfm_field_albums,
				emoji: client.iHorizon_Emojis.LastFM_Album,
				value: formatCount(profile.album_count)
			},
			{
				label: lang.lastfm_field_tracks,
				emoji: client.iHorizon_Emojis.Player_Playlist,
				value: formatCount(profile.track_count)
			}
		],
		blocks: [
			listening,
			ranking(
				artists,
				"topartists",
				"artist",
				lang.lastfm_overview_top_artists,
				false
			),
			ranking(
				tracks,
				"toptracks",
				"track",
				lang.lastfm_overview_top_tracks,
				true
			),
			ranking(
				albums,
				"topalbums",
				"album",
				lang.lastfm_overview_top_albums,
				true
			)
		],
		images: albumCovers
	});
	card.addActionRowComponents(profileButton(lang, profile.name ?? username));
	return card;
}
