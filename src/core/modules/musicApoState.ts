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

// The server's Equalizer APO configs (/music apo panel): up to five saved
// configs, one applied by default, a module switch, frozen configs. Pure
// state transitions: no Discord, no database, so the rules are testable.

import type { DatabaseStructure } from "../../../types/database_structure.js";

export type ApoState = DatabaseStructure.MusicApoSchema;
export type ApoConfig = DatabaseStructure.MusicApoConfig;

export const APO_MAX_CONFIGS = 5;
/** Largest config file, in bytes (15 KiB). */
export const APO_MAX_BYTES = 15 * 1024;
/** Most command lines (not counting blank lines and comments). */
export const APO_MAX_LINES = 50;
export const APO_NAME_MAX = 32;

export function emptyState(): ApoState {
	return { enabled: true, active: null, configs: [] };
}

/**
 * The stored value as a state. The first version stored one config as
 * `{ config, name, by, at }`: it becomes the only config, applied.
 */
export function migrate(stored: unknown): ApoState {
	if (!stored || typeof stored !== "object") return emptyState();
	const s = stored as Record<string, unknown>;
	if (Array.isArray(s.configs)) {
		const configs = (s.configs as ApoConfig[])
			.filter(
				(c) =>
					c &&
					typeof c.id === "string" &&
					typeof c.config === "string"
			)
			.slice(0, APO_MAX_CONFIGS);
		const active =
			typeof s.active === "string" &&
			configs.some((c) => c.id === s.active)
				? s.active
				: null;
		return { enabled: s.enabled !== false, active, configs };
	}
	if (typeof s.config === "string") {
		const id = "legacy";
		return {
			enabled: true,
			active: id,
			configs: [
				{
					id,
					name: cleanName(String(s.name ?? "config")) || "config",
					config: s.config,
					by: String(s.by ?? ""),
					at: Number(s.at) || Date.now(),
					frozen: null
				}
			]
		};
	}
	return emptyState();
}

/** The config to send to the player, or null when nothing applies. */
export function activeConfig(state: ApoState): ApoConfig | null {
	if (!state.enabled || !state.active) return null;
	return state.configs.find((c) => c.id === state.active) ?? null;
}

/** Lines that are commands: not blank, not a comment. */
export function commandLines(text: string): number {
	return text.split(/\r?\n/).filter((l) => {
		const t = l.trim();
		return t.length > 0 && !t.startsWith("#");
	}).length;
}

export type TextProblem = "empty" | "too_big" | "too_many_lines";

export function checkText(text: string): TextProblem | null {
	if (!text.trim()) return "empty";
	if (Buffer.byteLength(text, "utf-8") > APO_MAX_BYTES) return "too_big";
	if (commandLines(text) > APO_MAX_LINES) return "too_many_lines";
	return null;
}

/** A display name: one line, trimmed, at most APO_NAME_MAX characters. */
export function cleanName(name: string): string {
	return name
		.replace(/\s+/g, " ")
		.trim()
		.replace(/\.txt$/i, "")
		.trim()
		.slice(0, APO_NAME_MAX);
}

export type NameProblem = "empty" | "taken";

export function checkName(
	state: ApoState,
	name: string,
	exceptId?: string
): NameProblem | null {
	const clean = cleanName(name);
	if (!clean) return "empty";
	const lower = clean.toLowerCase();
	return state.configs.some(
		(c) => c.id !== exceptId && c.name.toLowerCase() === lower
	)
		? "taken"
		: null;
}

/** A short id, unique in the state. */
export function newId(state: ApoState, now = Date.now()): string {
	let id = now.toString(36);
	while (state.configs.some((c) => c.id === id)) id += "x";
	return id;
}

export function addConfig(
	state: ApoState,
	name: string,
	config: string,
	by: string,
	now = Date.now()
): ApoState {
	const id = newId(state, now);
	const configs = [
		...state.configs,
		{ id, name: cleanName(name), config, by, at: now, frozen: null }
	];
	// The first config of a server is applied right away.
	return { ...state, configs, active: state.active ?? id };
}

export function updateConfig(
	state: ApoState,
	id: string,
	patch: Partial<Pick<ApoConfig, "name" | "config" | "frozen">>,
	by: string,
	now = Date.now()
): ApoState {
	return {
		...state,
		configs: state.configs.map((c) =>
			c.id === id
				? {
						...c,
						...(patch.name !== undefined
							? { name: cleanName(patch.name) }
							: {}),
						...(patch.config !== undefined
							? { config: patch.config }
							: {}),
						...(patch.frozen !== undefined
							? { frozen: patch.frozen }
							: {}),
						updatedBy: by,
						updatedAt: now
					}
				: c
		)
	};
}

export function removeConfig(state: ApoState, id: string): ApoState {
	return {
		...state,
		configs: state.configs.filter((c) => c.id !== id),
		active: state.active === id ? null : state.active
	};
}

/** Who may unfreeze: whoever froze it, the server owners, the bot owners. */
export function canUnfreeze(
	config: ApoConfig,
	userId: string,
	isOwner: boolean
): boolean {
	return !config.frozen || isOwner || config.frozen.by === userId;
}
