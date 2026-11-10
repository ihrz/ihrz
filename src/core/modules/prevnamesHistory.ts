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
 * The previous names of a user (`prevnames` table): typed entries, oldest
 * first (DatabaseStructure.PrevnameEntry).
 *
 * Histories used to be strings, `<t:SECONDS:d> - [TYPE] NAME`, and may still
 * be: loadHistory reads both, alone or mixed, and whoever writes the history
 * back stores objects. tools/ClearNullPrevnames.ts converts a whole table.
 *
 * Writers read, clean and write the whole array rather than pushing:
 * userUpdate fires on every shard that sees the user, and a push per shard
 * stored the same change several times. Two shards racing now write the same
 * content. Partial users used to store a literal "null" as well: loading
 * drops those.
 */

import { escapeMarkdown } from "discord.js";

import type { DatabaseStructure } from "../../../types/database_structure.js";
import type { UnifiedDatabase } from "../database/types.js";

type PrevnameEntry = DatabaseStructure.PrevnameEntry;
type PrevnamesHistory = DatabaseStructure.PrevnamesHistory;

export type PrevnameChange =
	| { type: "username" | "displayname"; name: unknown }
	| {
			type: "nickname";
			name: unknown;
			guild: { id: string; name: unknown };
	  };

// Discord names are 32 characters at most, guild names 100.
const NAME_MAX = 100;
const UNKNOWN_GUILD = "?";
const SNOWFLAKE = /^\d{5,25}$/;
const LEGACY_ENTRY =
	/^<t:(\d+):\w>\s*-\s*(?:\[(username|globalName|nickname:.*?)\]\s*)?([\s\S]*)$/;
const LINE_BREAKING = /[\p{Cc}\p{Zl}\p{Zp}]/gu;
// Bidi overrides, zero-width spaces, soft hyphens, lone surrogates. The
// zero-width joiners stay: emoji sequences and Persian need them.
const INVISIBLE = /[\p{Cs}­͏؜᠎​‎‏‪-‮⁠-⁯︀-︎﻿]/gu;
const HAS_VISIBLE = /[^\s‌‍️\p{Mn}\p{Me}]/u;

/** A name safe to store, or null when nothing usable is left. */
export function sanitizeName(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const clean = value
		.replace(LINE_BREAKING, " ")
		.replace(INVISIBLE, "")
		.normalize("NFC")
		.replace(/\s+/g, " ")
		.trim();
	// Literal leftovers of partial users.
	if (clean === "null" || clean === "undefined") return null;
	if (!HAS_VISIBLE.test(clean)) return null;
	return Array.from(clean).slice(0, NAME_MAX).join("");
}

function toEntry(
	type: unknown,
	name: unknown,
	at: unknown,
	guild?: { id?: unknown; name?: unknown } | null
): PrevnameEntry | null {
	const clean = sanitizeName(name);
	if (!clean) return null;
	const date =
		typeof at === "number" && Number.isFinite(at) && at >= 0 ? at : null;
	if (type === "nickname") {
		return {
			type,
			name: clean,
			at: date,
			guild: {
				id:
					typeof guild?.id === "string" && SNOWFLAKE.test(guild.id)
						? guild.id
						: null,
				name: sanitizeName(guild?.name) ?? UNKNOWN_GUILD
			}
		};
	}
	if (type === "username" || type === "displayname") {
		return { type, name: clean, at: date };
	}
	return { type: "unknown", name: clean, at: date };
}

/** The parser of the old string format. */
export function parseLegacyEntry(entry: string): PrevnameEntry | null {
	const match = entry.match(LEGACY_ENTRY);
	if (!match) return toEntry("unknown", entry, null);
	const [, seconds, tag, name] = match;
	const at = Number(seconds) * 1000;
	if (tag?.startsWith("nickname:")) {
		return toEntry("nickname", name, at, {
			name: tag.slice("nickname:".length)
		});
	}
	return toEntry(tag === "globalName" ? "displayname" : tag, name, at);
}

function parseEntry(entry: unknown): PrevnameEntry | null {
	if (typeof entry === "string") return parseLegacyEntry(entry);
	if (!entry || typeof entry !== "object") return null;
	const e = entry as Record<string, unknown>;
	return toEntry(
		e.type,
		e.name,
		e.at,
		e.guild as { id?: unknown; name?: unknown } | null | undefined
	);
}

/**
 * A stored history as typed entries, oldest first, whatever format it is in,
 * without unusable entries and duplicates: the same name of the same type
 * (and the same server, for a nickname) is kept once, at its latest date.
 */
export function loadHistory(stored: unknown): PrevnamesHistory {
	if (!Array.isArray(stored)) return [];
	const latest = new Map<string, PrevnameEntry>();
	for (const raw of stored) {
		const entry = parseEntry(raw);
		if (!entry) continue;
		const guild = entry.type === "nickname" ? entry.guild.name : "";
		const key = `${entry.type}\u0000${guild}\u0000${entry.name}`;
		const previous = latest.get(key);
		// An old string knows the server's name only: keep a known id.
		if (
			entry.type === "nickname" &&
			previous?.type === "nickname" &&
			!entry.guild.id
		) {
			entry.guild.id = previous.guild.id;
		}
		// Delete first: a Map keeps the first insertion's place.
		latest.delete(key);
		latest.set(key, entry);
	}
	return [...latest.values()];
}

/** Add a name change to a user's history. A null or empty name is ignored. */
const MAX_PREVNAMES_ENTRIES = 200;

export async function recordPrevname(
	table: UnifiedDatabase,
	userId: string,
	change: PrevnameChange,
	at: Date = new Date()
): Promise<void> {
	if (!sanitizeName(change.name)) return;
	const stored = await table.get(userId);
	const history = Array.isArray(stored) ? stored : [];
	// Names can be changed at will: only the newest entries are kept.
	await table.set(
		userId,
		loadHistory([...history, { ...change, at: at.getTime() }]).slice(
			-MAX_PREVNAMES_ENTRIES
		)
	);
}

/**
 * A stored name as message text: markdown stays literal, and `<@id>`,
 * `<#id>` or `<t:...>` in a name is not rendered as a mention or a date.
 */
export function displayName(value: string): string {
	return escapeMarkdown(value).replace(/</g, "\\<");
}
