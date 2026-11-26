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
	BaseGuildTextChannel,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	Guild,
	SnowflakeUtil
} from "discord.js";

import { DatabaseStructure } from "../../types/database_structure.js";
import logger from "./logger.js";

// One result of the YouTube Data API `search.list` (fields read here).
interface YoutubeSearchItem {
	id: { videoId: string };
	snippet: {
		channelId: string;
		title: string;
		publishedAt: string;
		channelTitle: string;
	};
}
import { axios } from "./functions/axios.js";

export type Platform = "youtube" | "twitch" | "kick" | "bluesky" | "mastodon";

export const PLATFORMS: Platform[] = [
	"youtube",
	"twitch",
	"kick",
	"bluesky",
	"mastodon"
];

interface NotifierUserResponse {
	user: DatabaseStructure.NotifierUserSchema;
	platform: Platform;
	content: YoutubeRssResponse | TwitchResponse;
}

interface YoutubeRssResponse {
	title: string;
	link: string;
	pubDate: Date;
	author: string;
	id: string;
	isoDate: Date;
	channelId?: string;
}

interface TwitchResponse {
	title: string;
	link: string;
	pubDate: Date; // is started_at
	author: string; // is user_name
	id: string;
}

const MAX_NOTIFIED_MEDIAS_PER_USER = 50;
const FETCH_TIMEOUT_MS = 10_000;

/** A link to the followed account, by platform (the stored canonical value). */
export function profileUrl(platform: string, id: string): string {
	switch (platform) {
		case "twitch":
			return `https://twitch.tv/${id}`;
		case "kick":
			return `https://kick.com/${id}`;
		case "bluesky":
			return `https://bsky.app/profile/${id}`;
		case "mastodon": {
			const [user, host] = id.split("@");
			return `https://${host}/@${user}`;
		}
		default:
			return `https://youtube.com/channel/${id}`;
	}
}

/** A domain name, never an IP written out (the user picks the Mastodon instance). */
export function isDomain(host: string): boolean {
	return (
		host.length <= 253 &&
		host.includes(".") &&
		host
			.split(".")
			.every((l) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(l)) &&
		!host.split(".").every((l) => /^\d+$/.test(l)) &&
		!/(^|\.)(localhost|local|internal|lan|home)$/i.test(host)
	);
}

/** Reachable from the Internet: not loopback, private, link-local, CGNAT, multicast… */
export function isPublicIp(ip: string): boolean {
	const v4 = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
	const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(v4);
	if (m) {
		const [a, b] = [Number(m[1]), Number(m[2])];
		return !(
			a === 0 ||
			a === 10 ||
			a === 127 ||
			(a === 100 && b >= 64 && b < 128) ||
			(a === 169 && b === 254) ||
			(a === 172 && b >= 16 && b < 32) ||
			(a === 192 && b === 168) ||
			(a === 198 && (b === 18 || b === 19)) ||
			a >= 224
		);
	}
	const v6 = ip.toLowerCase();
	return !(
		v6 === "::" ||
		v6 === "::1" ||
		/^f[cd]/.test(v6) ||
		/^fe[89ab]/.test(v6) ||
		/^ff/.test(v6) ||
		v6.startsWith("2001:db8")
	);
}

/** The Mastodon instance comes from a user: every address it resolves to must be public. */
export async function isPublicHost(host: string): Promise<boolean> {
	if (!isDomain(host)) return false;
	try {
		const { lookup } = await import("node:dns/promises");
		const addresses = await lookup(host, { all: true });
		return (
			addresses.length > 0 &&
			addresses.every((a) => isPublicIp(a.address))
		);
	} catch {
		return false;
	}
}

/** GET JSON, bounded in time, never following a redirect (it could lead inside). */
async function getJson<T>(
	url: string,
	headers: Record<string, string> = {}
): Promise<{ status: number; data: T | null }> {
	const res = await fetch(url, {
		headers: { accept: "application/json", ...headers },
		redirect: "manual",
		signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
	});
	if (!res.ok) return { status: res.status, data: null };
	return { status: res.status, data: (await res.json()) as T };
}

/** Mastodon post text: its HTML reduced to text (only shown as a title). */
function stripHtml(html: string): string {
	return html
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<\/p>/gi, "\n")
		.replace(/<[^>]+>/g, "")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.trim();
}

interface BlueskyFeedItem {
	post: {
		uri: string;
		author: { did: string; handle: string; displayName?: string };
		record: { text?: string; createdAt?: string };
		indexedAt?: string;
	};
	/** Repost or pinned post: not a new post of the account. */
	reason?: unknown;
}

interface MastodonStatus {
	id: string;
	url: string | null;
	created_at: string;
	content: string;
	account: { username: string; display_name?: string };
}

interface KickChannel {
	broadcaster_user_id?: number;
	slug: string;
	stream_title?: string;
	stream?: { is_live?: boolean; start_time?: string };
}

/**
 * Keep only the last notified medias of each followed user.
 * The order of the list is preserved, the oldest entries are dropped.
 */
export function trimLastMediaNotified(
	medias: DatabaseStructure.NotifierLastNotifiedMedias[],
	max: number = MAX_NOTIFIED_MEDIAS_PER_USER
): DatabaseStructure.NotifierLastNotifiedMedias[] {
	const seen = new Map<string, number>();
	const keep = new Array<boolean>(medias.length).fill(false);

	for (let i = medias.length - 1; i >= 0; i--) {
		const count = (seen.get(medias[i].userId) || 0) + 1;
		seen.set(medias[i].userId, count);
		keep[i] = count <= max;
	}

	return medias.filter((_, i) => keep[i]);
}

export class StreamNotifier {
	private isRefreshing = false;
	private twitchClientID: string;
	private twitchAccessToken: string | null;
	private twitchAccessTokenExpireIn: number | null;
	private twitchClientSecret: string;
	private youtubeApiKey: string;
	private kickClientID: string;
	private kickClientSecret: string;
	private kickAccessToken: { value: string; expiresAt: number } | null = null;
	/** Mastodon `user@instance` → account id on its instance. */
	private mastodonIds = new Map<string, string>();

	constructor(
		twitchClientID: string,
		twitchClientSecret: string,
		youtubeApiKey: string,
		kickClientID = "",
		kickClientSecret = ""
	) {
		this.twitchClientID = twitchClientID;
		this.twitchClientSecret = twitchClientSecret;
		this.youtubeApiKey = youtubeApiKey;
		this.kickClientID = kickClientID;
		this.kickClientSecret = kickClientSecret;
	}

	/** Kick app token (client credentials), kept until shortly before it expires. */
	private async kickToken(): Promise<string | null> {
		if (!this.kickClientID || !this.kickClientSecret) return null;
		if (this.kickAccessToken && Date.now() < this.kickAccessToken.expiresAt)
			return this.kickAccessToken.value;
		const res = await fetch("https://id.kick.com/oauth/token", {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				grant_type: "client_credentials",
				client_id: this.kickClientID,
				client_secret: this.kickClientSecret
			}),
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
		});
		if (!res.ok) return null;
		const body = (await res.json()) as {
			access_token?: string;
			expires_in?: number;
		};
		if (!body.access_token) return null;
		// The docs give no unit: seconds, and never kept more than an hour.
		const lifetime = Math.min(Math.max(body.expires_in ?? 3600, 120), 3600);
		this.kickAccessToken = {
			value: body.access_token,
			expiresAt: Date.now() + (lifetime - 60) * 1000
		};
		return body.access_token;
	}

	private async kickChannel(slug: string): Promise<KickChannel | null> {
		const token = await this.kickToken();
		if (!token) return null;
		const { data } = await getJson<{ data?: KickChannel[] }>(
			`https://api.kick.com/public/v1/channels?slug=${encodeURIComponent(slug)}`,
			{ authorization: `Bearer ${token}` }
		);
		return data?.data?.[0] ?? null;
	}

	/** A live Kick stream, like Twitch: one notification per stream (its start time). */
	private async checkKickStream(
		slug: string
	): Promise<TwitchResponse | null> {
		const channel = await this.kickChannel(slug);
		if (!channel?.stream?.is_live || !channel.stream.start_time)
			return null;
		const started = new Date(channel.stream.start_time);
		if (Number.isNaN(started.getTime())) return null;
		return {
			pubDate: started,
			title: channel.stream_title || slug,
			link: `https://kick.com/${channel.slug}`,
			author: channel.slug,
			id: `${channel.slug}:${channel.stream.start_time}`
		};
	}

	/** The account's latest own post (no reply, repost or pinned post). */
	private async latestBlueskyPost(
		did: string
	): Promise<TwitchResponse | null> {
		const { data } = await getJson<{ feed?: BlueskyFeedItem[] }>(
			`https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(did)}&filter=posts_no_replies&limit=10`
		);
		const own = (data?.feed ?? []).filter(
			(i) => !i.reason && i.post?.author?.did === did
		);
		const posts = own
			.map((i) => ({
				item: i,
				at: new Date(i.post.record?.createdAt || i.post.indexedAt || "")
			}))
			.filter((p) => !Number.isNaN(p.at.getTime()))
			.sort((a, b) => b.at.getTime() - a.at.getTime());
		const latest = posts[0];
		if (!latest) return null;
		const { post } = latest.item;
		const rkey = post.uri.split("/").pop();
		return {
			pubDate: latest.at,
			title: (post.record?.text || "").slice(0, 200),
			link: `https://bsky.app/profile/${post.author.handle}/post/${rkey}`,
			author: post.author.displayName || post.author.handle,
			id: post.uri
		};
	}

	private async mastodonAccountId(acct: string): Promise<string | null> {
		const known = this.mastodonIds.get(acct);
		if (known) return known;
		const [user, host] = acct.split("@");
		if (!user || !host || !(await isPublicHost(host))) return null;
		const { data } = await getJson<{ id?: string }>(
			`https://${host}/api/v1/accounts/lookup?acct=${encodeURIComponent(user)}`
		);
		if (!data?.id) return null;
		this.mastodonIds.set(acct, data.id);
		return data.id;
	}

	/** The account's latest own post (no reply, no boost). */
	private async latestMastodonPost(
		acct: string
	): Promise<TwitchResponse | null> {
		const id = await this.mastodonAccountId(acct);
		const host = acct.split("@")[1];
		if (!id || !host || !(await isPublicHost(host))) return null;
		const { data } = await getJson<MastodonStatus[]>(
			`https://${host}/api/v1/accounts/${encodeURIComponent(id)}/statuses?exclude_replies=true&exclude_reblogs=true&limit=5`
		);
		const latest = (data ?? [])
			.filter((st) => !Number.isNaN(new Date(st.created_at).getTime()))
			.sort(
				(a, b) =>
					new Date(b.created_at).getTime() -
					new Date(a.created_at).getTime()
			)[0];
		if (!latest) return null;
		return {
			pubDate: new Date(latest.created_at),
			title: stripHtml(latest.content).slice(0, 200),
			link:
				latest.url ||
				`https://${host}/@${acct.split("@")[0]}/${latest.id}`,
			author: latest.account.display_name || latest.account.username,
			id: latest.id
		};
	}

	/**
	 * What the user typed (link, @handle, id) as the value stored for the platform, with a name to show, or
	 * null when the account does not exist. Same canonical values as the gateway (dash_notifier.rs): YouTube
	 * channel id, Twitch login, Kick slug, Bluesky DID, Mastodon `user@instance`.
	 */
	public async resolveAuthor(
		platform: Platform,
		input: string
	): Promise<{ id: string; name: string } | null> {
		const raw = input.trim();
		try {
			switch (platform) {
				case "kick": {
					const slug = (
						/kick\.com\/([^/?#]+)/i.exec(raw)?.[1] ??
						raw.replace(/^@/, "")
					).toLowerCase();
					if (!/^[a-z0-9_-]{1,25}$/.test(slug)) return null;
					const channel = await this.kickChannel(slug);
					return channel
						? { id: channel.slug, name: channel.slug }
						: null;
				}
				case "bluesky": {
					const actor = (
						/bsky\.app\/profile\/([^/?#]+)/i.exec(raw)?.[1] ??
						raw.replace(/^@/, "")
					).trim();
					if (
						!actor.startsWith("did:") &&
						!isDomain(actor.toLowerCase())
					)
						return null;
					const { data } = await getJson<{
						did?: string;
						handle?: string;
						displayName?: string;
					}>(
						`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(actor)}`
					);
					return data?.did
						? {
								id: data.did,
								name:
									data.displayName || data.handle || data.did
							}
						: null;
				}
				case "mastodon": {
					const url = /^https?:\/\/([^/]+)\/@([A-Za-z0-9_]+)/.exec(
						raw
					);
					const [user, host] = url
						? [url[2], url[1]]
						: raw.replace(/^@/, "").split("@");
					if (!user || !host || !/^[A-Za-z0-9_]{1,30}$/.test(user))
						return null;
					const lowerHost = host.toLowerCase();
					if (!(await isPublicHost(lowerHost))) return null;
					const { data } = await getJson<{
						id?: string;
						username?: string;
						display_name?: string;
					}>(
						`https://${lowerHost}/api/v1/accounts/lookup?acct=${encodeURIComponent(user)}`
					);
					if (!data?.id || !data.username) return null;
					const acct = `${data.username}@${lowerHost}`;
					this.mastodonIds.set(acct, data.id);
					return {
						id: acct,
						name: data.display_name || data.username
					};
				}
				case "youtube":
				case "twitch": {
					const exists = await this.authorExistOnPlatform(
						platform,
						raw
					);
					return exists
						? {
								id: raw,
								name: await this.getChannelNameById(
									platform,
									raw
								)
							}
						: null;
				}
			}
		} catch (error) {
			logger.err(`notifier: cannot resolve ${platform} ${raw}: ${error}`);
		}
		return null;
	}

	/**
	 * Index of a followed account in `users`: the exact value, without case, then the canonical value of what
	 * was typed (a Bluesky @handle finds the stored DID). -1 when it is not followed.
	 */
	public async findFollowed(
		users: DatabaseStructure.NotifierUserSchema[],
		platform: Platform,
		input: string
	): Promise<number> {
		const same = (id: string) =>
			users.findIndex(
				(u) =>
					u.platform === platform &&
					u.id_or_username.toLowerCase() === id.toLowerCase()
			);
		const direct = same(input.trim());
		if (direct !== -1) return direct;
		const resolved = await this.resolveAuthor(platform, input);
		return resolved ? same(resolved.id) : -1;
	}

	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	private async getGuildData(
		guildID: string
	): Promise<DatabaseStructure.NotifierSchema | null> {
		const all = (await client.db.get(
			`${guildID}.NOTIFIER`
		)) as DatabaseStructure.NotifierSchema | null;
		return all;
	}

	private async getGuildsData(): Promise<
		{ value: DatabaseStructure.NotifierSchema; guildId: string }[]
	> {
		const result: {
			value: DatabaseStructure.NotifierSchema;
			guildId: string;
		}[] = [];

		for (const guild of client.guilds.cache.values()) {
			// Only the sub-key is needed: never pull the whole guild document.
			const notifier = await this.getGuildData(guild.id);
			if (notifier) {
				result.push({ value: notifier, guildId: guild.id });
			}
		}

		return result;
	}

	private getLatestMedia(
		items: YoutubeRssResponse[]
	): YoutubeRssResponse | null {
		return items?.reduce((latest, item) => {
			return new Date(item.pubDate) > new Date(latest.pubDate)
				? item
				: latest;
		}, items[0]);
	}

	private async getLatestYouTubeVideos(
		channelId: string
	): Promise<YoutubeRssResponse[]> {
		const url = `https://www.googleapis.com/youtube/v3/search?key=${this.youtubeApiKey}&channelId=${encodeURIComponent(channelId)}&part=snippet,id&order=date&maxResults=5`;
		try {
			const response = await axios.get(url);
			if (response.data.error) {
				return [];
			}

			return response.data.items
				.filter(
					(item: YoutubeSearchItem) =>
						item.snippet.channelId === channelId
				)
				.map((item: YoutubeSearchItem) => ({
					title: item.snippet.title,
					link: `https://www.youtube.com/watch?v=${item.id.videoId}`,
					pubDate: new Date(item.snippet.publishedAt),
					author: item.snippet.channelTitle,
					id: item.id.videoId,
					isoDate: new Date(item.snippet.publishedAt),
					channelId: item.snippet.channelId
				}));
		} catch (error) {
			logger.err(
				`Error fetching YouTube videos for channel ${channelId}: ${error}`
			);
			return [];
		}
	}

	private async fetchUsersMedias(
		users: DatabaseStructure.NotifierUserSchema[]
	): Promise<NotifierUserResponse[]> {
		const result: NotifierUserResponse[] = [];

		for (const user of users) {
			try {
				if (user.platform === "youtube") {
					const videos = await this.getLatestYouTubeVideos(
						user.id_or_username
					);
					const latestMedia = this.getLatestMedia(videos);

					if (
						latestMedia &&
						latestMedia.channelId === user.id_or_username
					) {
						result.push({
							user,
							content: latestMedia,
							platform: "youtube"
						});
					} else if (latestMedia) {
						logger.warn(
							`Video ${latestMedia.id} does not belong to channel ${user.id_or_username}, skipping notification`
						);
					}
				} else if (user.platform === "twitch") {
					const feed = await this.checkTwitchStream(
						user.id_or_username
					);
					if (feed) {
						result.push({
							user,
							content: feed,
							platform: "twitch"
						});
					}
				} else if (
					user.platform === "kick" ||
					user.platform === "bluesky" ||
					user.platform === "mastodon"
				) {
					const feed =
						user.platform === "kick"
							? await this.checkKickStream(user.id_or_username)
							: user.platform === "bluesky"
								? await this.latestBlueskyPost(
										user.id_or_username
									)
								: await this.latestMastodonPost(
										user.id_or_username
									);
					if (feed) {
						result.push({
							user,
							content: feed,
							platform: user.platform
						});
					}
				}
			} catch (error) {
				logger.err(
					`Erreur lors de la vérification des flux pour ${user.id_or_username} sur ${user.platform} : ${error}`
				);
			}
			await this.delay(5_000);
		}
		return result;
	}

	private async checkTwitchStream(
		userName: string
	): Promise<TwitchResponse | null> {
		try {
			const { data } = await axios.get(
				`https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(userName)}`,
				{
					headers: {
						"Client-ID": this.twitchClientID,
						Authorization: `Bearer ${this.twitchAccessToken}`
					}
				}
			);

			if (data.data && data.data.length > 0) {
				return {
					pubDate: new Date(data.data[0].started_at),
					title: data.data[0].title,
					link: "https://twitch.tv/" + userName,
					author: data.data[0].user_name,
					id: data.data[0].id
				};
			} else {
				return null;
			}
		} catch {
			return null;
		}
	}

	private async mediaHaveAlreadyBeNotified(
		guildID: string,
		media: NotifierUserResponse
	): Promise<boolean> {
		const notifiedMedias = ((await client.db.get(
			`${guildID}.NOTIFIER.lastMediaNotified`
		)) || []) as DatabaseStructure.NotifierLastNotifiedMedias[];
		return notifiedMedias.some(
			(item) =>
				item.userId === media.user.id_or_username &&
				(item.mediaId === media.content.id ||
					new Date(item.timestamp) >= new Date(media.content.pubDate))
		);
	}

	private createLinkButton(
		url: string,
		label: string
	): ActionRowBuilder<ButtonBuilder> {
		return new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setStyle(ButtonStyle.Link)
				.setURL(url)
				.setLabel(label)
		);
	}

	public async authorExist(
		guildId: string,
		platform: Platform,
		author_id_or_username: string
	): Promise<boolean> {
		const allGuildsData = (await client.db.get(
			`${guildId}.NOTIFIER`
		)) as DatabaseStructure.NotifierSchema;

		const users = allGuildsData.users || [];
		const userExists = users.some(
			(user) =>
				user.platform === platform &&
				user.id_or_username === author_id_or_username
		);
		if (userExists) {
			return true;
		}

		return false;
	}

	public async authorExistOnPlatform(
		platform: Platform,
		author_id_or_username: string
	): Promise<boolean> {
		try {
			if (
				platform === "kick" ||
				platform === "bluesky" ||
				platform === "mastodon"
			) {
				return !!(await this.resolveAuthor(
					platform,
					author_id_or_username
				));
			}
			if (platform === "youtube") {
				return (
					await this.checkYouTubeChannelExists(author_id_or_username)
				).state;
			} else if (platform === "twitch") {
				return (await this.checkTwitchUserExists(author_id_or_username))
					.state;
			} else {
				throw new Error("Unsupported platform");
			}
		} catch (error) {
			logger.err(
				`Error checking if author exists on platform ${platform} for ${author_id_or_username}: ${error}`
			);
			return false;
		}
	}

	public async getChannelNameById(
		platform: Platform,
		author_id_or_username: string
	): Promise<string> {
		try {
			if (
				platform === "kick" ||
				platform === "bluesky" ||
				platform === "mastodon"
			) {
				return (
					(await this.resolveAuthor(platform, author_id_or_username))
						?.name || author_id_or_username
				);
			}
			if (platform === "youtube") {
				return (
					(
						await this.checkYouTubeChannelExists(
							author_id_or_username
						)
					).name || author_id_or_username
				);
			} else if (platform === "twitch") {
				return (
					(await this.checkTwitchUserExists(author_id_or_username))
						.name || author_id_or_username
				);
			} else {
				throw new Error("Unsupported platform");
			}
		} catch (error) {
			logger.err(
				`Error checking if author exists on platform ${platform} for ${author_id_or_username}: ${error}`
			);
			return author_id_or_username;
		}
	}

	private async checkYouTubeChannelExists(
		channelId: string
	): Promise<{ state: boolean; name?: string }> {
		try {
			const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${encodeURIComponent(channelId)}&key=${this.youtubeApiKey}`;
			const response = await axios.get(url);

			if (response.data.items && response.data.items.length > 0) {
				const channel = response.data.items[0];
				return { state: true, name: channel.snippet.title };
			} else {
				return { state: false };
			}
		} catch (error) {
			logger.err(`Error checking YouTube channel ${channelId}: ${error}`);
			return { state: false };
		}
	}

	private async checkTwitchUserExists(
		userName: string
	): Promise<{ state: boolean; name?: string }> {
		try {
			const url = `https://api.twitch.tv/helix/users?login=${encodeURIComponent(userName)}`;
			const response = await axios.get(url, {
				headers: {
					"Client-ID": this.twitchClientID,
					Authorization: `Bearer ${this.twitchAccessToken}`
				}
			});

			return { state: response.data?.data.length > 0 };
		} catch (error) {
			const response = (error as { response?: { status?: number } })
				.response;
			if (response && response.status === 404) {
				return { state: false };
			}
			throw error;
		}
	}

	private async getAppAccessToken(): Promise<void> {
		try {
			const response = await axios.post(
				"https://id.twitch.tv/oauth2/token",
				{
					client_id: this.twitchClientID,
					client_secret: this.twitchClientSecret,
					grant_type: "client_credentials"
				}
			);

			const { access_token, expires_in } = response.data;
			this.twitchAccessToken = access_token;
			this.twitchAccessTokenExpireIn = Date.now() + expires_in * 1000;
		} catch (error) {
			throw new Error(`Failed to get app access token: ${error}`);
		}
	}

	private async ensureValidAccessToken(): Promise<void> {
		if (
			!this.twitchAccessToken ||
			!this.twitchAccessTokenExpireIn ||
			Date.now() >= this.twitchAccessTokenExpireIn
		) {
			await this.getAppAccessToken();
		}
	}

	public async generateAuthorsEmbed(guild: Guild): Promise<EmbedBuilder> {
		const lang = await client.func.getLanguageData(guild?.id);
		const authors = (await this.getGuildData(guild.id))?.users || [];
		const embed = new EmbedBuilder();
		let desc = lang.notifier_generateAuthorsEmbed_embed_desc;
		for (const author of authors) {
			const link = profileUrl(author.platform, author.id_or_username);
			const author_name = await this.getChannelNameById(
				author.platform,
				author.id_or_username
			);
			// The account's own channel, when it has one.
			const where = author.channelId ? ` → <#${author.channelId}>` : "";
			desc += `${author.platform} - [\`${author_name}\`](${link})${where}\n`;
		}
		embed.setTitle(lang.notifier_generateAuthorsEmbed_embed_title);
		embed.setColor(2829617);
		embed.setDescription(desc);

		return embed;
	}

	public async generateConfigurationEmbed(
		guild: Guild
	): Promise<EmbedBuilder> {
		const lang = await client.func.getLanguageData(guild?.id);
		const config = await this.getGuildData(guild.id);

		const channel = await guild.channels
			.fetch(config?.channelId || "")
			.catch(() => null);
		const embed = new EmbedBuilder();

		embed.setTitle(lang.notifier_generateConfigurationEmbed_embed_title);
		embed.setColor(2829617);
		embed.setFields(
			{
				name: lang.notifier_generateConfigurationEmbed_embed_fields_1_name,
				value: `${channel?.id ? channel.toString() : lang.setjoinroles_var_none}`,
				inline: false
			},
			{
				name: lang.notifier_generateConfigurationEmbed_embed_fields_2_name,
				value: `${config?.message || lang.notifier_on_new_media_default_message}`,
				inline: false
			}
		);
		return embed;
	}

	/** A media worth a notification: its id, link and date are known. */
	private isCompleteMedia(media: NotifierUserResponse): boolean {
		const c = media.content;
		return (
			!!c?.id &&
			!!c.link &&
			c.pubDate instanceof Date &&
			!Number.isNaN(c.pubDate.getTime())
		);
	}

	/** A text or announcement channel of this guild, by id (an empty id is no channel). */
	private async guildChannel(
		guild: Guild | null,
		id: string | null | undefined,
		cache: Map<string, BaseGuildTextChannel | null>
	): Promise<BaseGuildTextChannel | null> {
		if (!guild || !id || !/^\d{17,20}$/.test(id)) return null;
		if (cache.has(id)) return cache.get(id) ?? null;
		const channel = await guild.channels.fetch(id).catch(() => null);
		const usable =
			channel && channel.guildId === guild.id && channel.isTextBased()
				? (channel as BaseGuildTextChannel)
				: null;
		cache.set(id, usable);
		return usable;
	}

	private async refresh() {
		if (this.isRefreshing) {
			return;
		}

		this.isRefreshing = true;

		try {
			await this.runRefresh();
		} catch (error) {
			logger.err(`notifier: refresh failed: ${error}`);
		} finally {
			this.isRefreshing = false;
		}
	}

	private async runRefresh() {
		// Without Twitch keys the other platforms are still checked.
		await this.ensureValidAccessToken().catch(() => undefined);
		const guildsData = await this.getGuildsData();

		for (const entry of guildsData) {
			const guild = await client.guilds
				.fetch(entry.guildId)
				.catch(() => null);
			const channels = new Map<string, BaseGuildTextChannel | null>();
			const lang = await client.func.getLanguageData(guild?.id);
			const medias = await this.fetchUsersMedias(entry.value.users || []);

			for (const media of medias) {
				// The account's own channel, else the default one.
				const channel = await this.guildChannel(
					guild,
					media.user.channelId || entry.value.channelId,
					channels
				);
				if (
					this.isCompleteMedia(media) &&
					!(await this.mediaHaveAlreadyBeNotified(
						entry.guildId,
						media
					))
				) {
					const message =
						client.func.method.generateCustomMessagePreview(
							entry.value.message ||
								lang.notifier_on_new_media_default_message,
							{
								guild: guild!,
								user: client.user!,
								guildLocal: "en-US",
								notifier: {
									artistAuthor: media.content.author,
									artistLink: profileUrl(
										media.platform,
										media.user.id_or_username
									),
									mediaURL: media.content.link
								}
							}
						);

					if (channel) {
						const notifiedPath = `${entry.guildId}.NOTIFIER.lastMediaNotified`;
						await client.db.push(notifiedPath, {
							userId: media.user.id_or_username,
							mediaId: media.content.id,
							timestamp: media.content.pubDate.toISOString()
						});

						const notified = ((await client.db.get(notifiedPath)) ||
							[]) as DatabaseStructure.NotifierLastNotifiedMedias[];
						const trimmed = trimLastMediaNotified(notified);

						if (trimmed.length !== notified.length) {
							await client.db.set(notifiedPath, trimmed);
						}
						await channel.send({
							content: message,
							components: [
								this.createLinkButton(
									media.content.link,
									lang.notifier_on_new_media_default_button_label
								)
							],
							// Admin-configured announcement: keep its pings.
							allowedMentions: {
								parse: ["everyone", "roles", "users"]
							},
							nonce: SnowflakeUtil.generate().toString(),
							enforceNonce: true
						});
					}
				}
			}
		}
	}

	public async start() {
		// No Twitch keys (or Twitch down): the other platforms still start.
		await this.getAppAccessToken().catch((error) => {
			logger.warn(`notifier: no Twitch token (${error})`);
		});

		await this.refresh();
		setInterval(async () => await this.refresh(), 120_000);
	}
}
