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
 * The previous names of a user (`prevnames` table): an array of strings,
 * oldest first, in the format HorizonGateway's public API also serves:
 *
 *     <t:SECONDS:d> - [username|globalName|nickname:GUILD] VALUE
 *
 * Writers read, clean and write the whole array rather than pushing:
 * userUpdate fires on every shard that sees the user, and a push per shard
 * stored the same change several times. Two shards racing now write the same
 * content. Partial users used to store a literal "null" as well: cleaning
 * drops those, and repairs histories stored before this module.
 */

import { escapeMarkdown, time } from "discord.js";

import type { DatabaseStructure } from "../../../types/database_structure.js";
import type { UnifiedDatabase } from "../database/types.js";

export type PrevnameChange =
	| { kind: "username" | "globalName"; value: unknown }
	| { kind: "nickname"; value: unknown; guild: string };

export interface ParsedPrevname {
	/** Unix seconds; null on an entry stored without a date. */
	seconds: number | null;
	/** `username`, `globalName`, `nickname:GUILD`; null on old plain entries. */
	tag: string | null;
	value: string;
}

// Discord names are 32 characters at most, guild names 100.
const NAME_MAX = 100;
const ENTRY =
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

/** The guild name inside a `[nickname:GUILD]` tag: no bracket can close it. */
function sanitizeTagName(value: unknown): string | null {
	return sanitizeName(value)?.replace(/\[/g, "(").replace(/\]/g, ")") ?? null;
}

export function parseEntry(entry: string): ParsedPrevname {
	const match = entry.match(ENTRY);
	if (!match) return { seconds: null, tag: null, value: entry };
	return {
		seconds: Number(match[1]),
		tag: match[2] ?? null,
		value: match[3]
	};
}

function serialize(parsed: ParsedPrevname): string {
	if (parsed.seconds === null) return parsed.value;
	const tag = parsed.tag ? `[${parsed.tag}] ` : "";
	return `<t:${parsed.seconds}:d> - ${tag}${parsed.value}`;
}

/**
 * A stored history without unusable entries and duplicates, oldest first. The
 * same name of the same kind (and the same server, for a nickname) is kept
 * once, at its latest date.
 */
export function cleanHistory(
	stored: unknown
): DatabaseStructure.PrevnamesHistory {
	if (!Array.isArray(stored)) return [];
	const latest = new Map<string, ParsedPrevname>();
	for (const entry of stored) {
		if (typeof entry !== "string") continue;
		const parsed = parseEntry(entry);
		const value = sanitizeName(parsed.value);
		if (!value) continue;
		let tag = parsed.tag;
		if (tag?.startsWith("nickname:")) {
			tag = `nickname:${sanitizeTagName(tag.slice("nickname:".length)) ?? "?"}`;
		}
		const key = `${tag ?? ""}\u0000${value}`;
		// Delete first: a Map keeps the first insertion's place.
		latest.delete(key);
		latest.set(key, { seconds: parsed.seconds, tag, value });
	}
	return [...latest.values()].map(serialize);
}

/** Add a name change to a user's history. A null or empty name is ignored. */
export async function recordPrevname(
	table: UnifiedDatabase,
	userId: string,
	change: PrevnameChange,
	at: Date = new Date()
): Promise<void> {
	const value = sanitizeName(change.value);
	if (!value) return;
	const tag =
		change.kind === "nickname"
			? `nickname:${sanitizeTagName(change.guild) ?? "?"}`
			: change.kind;
	const stored = await table.get(userId);
	const history = Array.isArray(stored) ? stored : [];
	await table.set(
		userId,
		cleanHistory([...history, `${time(at, "d")} - [${tag}] ${value}`])
	);
}

/**
 * A stored name as message text: markdown stays literal, and `<@id>`,
 * `<#id>` or `<t:...>` in a name is not rendered as a mention or a date.
 */
export function displayName(value: string): string {
	return escapeMarkdown(value).replace(/</g, "\\<");
}
