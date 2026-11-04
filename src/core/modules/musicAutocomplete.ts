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
 * Track suggestions for /music play and /music lyrics: same sources as a
 * text query in musicPlay (Deezer first, SoundCloud when Deezer has nothing).
 * The chosen value is the track URL, which both commands resolve to exactly
 * that track. Discord drops an
 * autocomplete answer after 3 s, so searches are bounded and cached: typing
 * a title fires one request per keystroke.
 */

import { AutocompleteInteraction, Client } from "discord.js";
import type { SearchResult, Track } from "lavalink-client";

import { isUrlQuery, responseExist } from "../functions/musicPlay.js";

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 100;
const MAX_CHOICES = 10;
const SEARCH_TIMEOUT_MS = 2_000;
const CACHE_TTL_MS = 60_000;
const CACHE_MAX_ENTRIES = 500;
// Discord limit for choice names and values.
const CHOICE_MAX_LENGTH = 100;

interface Choice {
	name: string;
	value: string;
}

const cache = new Map<string, { expires: number; choices: Choice[] }>();

function clip(value: string, max = CHOICE_MAX_LENGTH): string {
	return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

function formatDuration(ms: number): string {
	const total = Math.floor(ms / 1000);
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	const seconds = String(total % 60).padStart(2, "0");
	return hours
		? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`
		: `${minutes}:${seconds}`;
}

function toChoice(track: Track): Choice | null {
	const title = track.info.title?.trim();
	if (!title) return null;
	const author = track.info.author?.trim();
	const duration =
		!track.info.isStream && track.info.duration
			? ` (${formatDuration(track.info.duration)})`
			: "";
	const label = author ? `${title} - ${author}` : title;
	const name = `${clip(label, CHOICE_MAX_LENGTH - duration.length)}${duration}`;

	// The URL plays exactly the suggested track; a too long one falls back
	// to a text query.
	const uri = track.info.uri;
	const value = uri && uri.length <= CHOICE_MAX_LENGTH ? uri : clip(label);
	return { name, value };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
	return new Promise((resolve) => {
		const timer = setTimeout(() => resolve(null), ms);
		promise
			.then((value) => resolve(value))
			.catch(() => resolve(null))
			.finally(() => clearTimeout(timer));
	});
}

async function search(
	client: Client,
	interaction: AutocompleteInteraction,
	query: string
): Promise<Choice[]> {
	const node = Array.from(client.player.nodeManager.nodes.values()).find(
		(candidate) => candidate.connected !== false
	);
	if (!node) return [];

	const deadline = Date.now() + SEARCH_TIMEOUT_MS;
	let res: SearchResult | null = null;
	for (const source of ["deezer", "soundcloud"] as const) {
		const remaining = deadline - Date.now();
		if (remaining <= 0) break;
		res = await withTimeout(
			node.search({ query, source }, interaction.user),
			remaining
		);
		if (res && responseExist(res)) break;
	}
	if (!res || !responseExist(res)) return [];

	const seen = new Set<string>();
	const choices: Choice[] = [];
	for (const track of res.tracks) {
		const choice = toChoice(track as Track);
		if (!choice || seen.has(choice.value)) continue;
		seen.add(choice.value);
		choices.push(choice);
		if (choices.length === MAX_CHOICES) break;
	}
	return choices;
}

function remember(key: string, choices: Choice[]): void {
	if (cache.size >= CACHE_MAX_ENTRIES) {
		const now = Date.now();
		for (const [entry, value] of cache) {
			if (value.expires <= now) cache.delete(entry);
		}
		// Still full: drop the oldest entries (Map keeps insertion order).
		for (const entry of cache.keys()) {
			if (cache.size < CACHE_MAX_ENTRIES) break;
			cache.delete(entry);
		}
	}
	cache.set(key, { expires: Date.now() + CACHE_TTL_MS, choices });
}

export async function musicTrackAutocomplete(
	client: Client,
	interaction: AutocompleteInteraction
): Promise<void> {
	const query = String(interaction.options.getFocused() ?? "")
		.trim()
		.slice(0, MAX_QUERY_LENGTH);

	let choices: Choice[] = [];
	if (isUrlQuery(query)) {
		// A link is played as is: offer it back so Enter keeps it.
		if (query.length <= CHOICE_MAX_LENGTH) {
			choices = [{ name: query, value: query }];
		}
	} else if (query.length >= MIN_QUERY_LENGTH) {
		const key = query.toLowerCase();
		const cached = cache.get(key);
		if (cached && cached.expires > Date.now()) {
			choices = cached.choices;
		} else {
			choices = await search(client, interaction, query);
			remember(key, choices);
		}
	}

	await interaction.respond(choices).catch(() => null);
}
