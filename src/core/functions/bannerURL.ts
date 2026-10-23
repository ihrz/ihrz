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

import { Guild, GuildMember, User } from "discord.js";

import { axios } from "./axios.js";

const BANNER_CDN_BASE = "https://cdn.discordapp.com/banners";
const DISCORD_API_BASE = "https://discord.com/api/v10";
const USER_BANNER_CACHE_TTL = 10 * 60 * 1000;

export type BannerExtension = "png" | "gif" | "webp" | "jpg" | "jpeg";

export interface BannerUrlOptions {
	/** Image size in pixels, power of two between 16 and 4096. */
	size?: number;
	extension?: BannerExtension;
	/** Returns a static image even for animated banners. */
	forceStatic?: boolean;
}

export interface BannerSource {
	id: string;
	banner?: string | null;
	/** Present on every guild-like target (Guild, InviteGuild, GuildPreview). */
	features?: string[];
}

interface CachedBannerHash {
	hash: string | null;
	expires: number;
}

const userBannerCache = new Map<string, CachedBannerHash>();

async function fetchUserBannerHash(userId: string): Promise<string | null> {
	const now = Date.now();
	const cached = userBannerCache.get(userId);

	if (cached && cached.expires > now) {
		return cached.hash;
	}

	let hash: string | null = null;

	try {
		const response = await axios.get<{ banner?: string | null }>(
			`${DISCORD_API_BASE}/users/${userId}`,
			{
				headers: {
					Authorization: `Bot ${client.config.discord.token}`
				}
			}
		);

		hash = response.data?.banner ?? null;
	} catch {
		hash = null;
	}

	userBannerCache.set(userId, {
		hash,
		expires: now + USER_BANNER_CACHE_TTL
	});

	return hash;
}

function buildBannerUrl(
	id: string,
	hash: string,
	options?: BannerUrlOptions
): string {
	const animated = hash.startsWith("a_");

	let extension: BannerExtension;
	if (!options?.forceStatic && animated) {
		extension = options?.extension ?? "gif";
		if (extension !== "gif" && extension !== "webp") {
			extension = "gif";
		}
	} else {
		extension = options?.extension ?? "webp";
	}

	let url = `${BANNER_CDN_BASE}/${id}/${hash}.${extension}`;

	if (options?.size) {
		url += `?size=${options.size}`;
	}

	return url;
}

export default async function bannerURL(
	target: User | GuildMember | Guild | BannerSource,
	options?: BannerUrlOptions
): Promise<string | null> {
	if (target.banner) {
		return buildBannerUrl(target.id, target.banner, options);
	}

	// A guild-like target always exposes its banner hash, even when null.
	if ("features" in target) {
		return null;
	}

	// User-like target without a known banner hash: resolve it from the REST API.
	const hash = await fetchUserBannerHash(target.id);

	if (!hash) {
		return null;
	}

	return buildBannerUrl(target.id, hash, options);
}
