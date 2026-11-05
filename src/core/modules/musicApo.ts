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

// Server-wide Equalizer APO filter (/music apo). The configuration text is
// stored per guild and sent to Wavyzon's `apo` plugin filter
// (`filters.pluginFilters.apo.config`) on the guild's player, now and on
// every player created later. Only Wavyzon nodes know this filter.

import type { LavalinkNode, Player } from "lavalink-client";

import { DatabaseStructure } from "../../../types/database_structure.js";
import logger from "../logger.js";

// Largest APO file accepted (Wavyzon accepts up to 256 KiB; real configs,
// even long AutoEQ GraphicEQ lines, are a few KiB).
export const APO_MAX_BYTES = 64 * 1024;

// Time allowed to Wavyzon to validate a configuration.
const CHECK_TIMEOUT_MS = 5_000;

const dbPath = (guildId: string) => `${guildId}.MUSIC_APO`;

export async function getGuildApo(
	guildId: string
): Promise<DatabaseStructure.MusicApoSchema | null> {
	const stored = (await client.db.get(
		dbPath(guildId)
	)) as DatabaseStructure.MusicApoSchema | null;
	return stored && typeof stored.config === "string" ? stored : null;
}

export async function setGuildApo(
	guildId: string,
	apo: DatabaseStructure.MusicApoSchema | null
): Promise<void> {
	if (apo) {
		await client.db.set(dbPath(guildId), apo);
	} else {
		await client.db.delete(dbPath(guildId));
	}
}

export type ApoCheck =
	| { ok: true; stages: string[]; warnings: string[] }
	| { ok: false; unsupported: true }
	| { ok: false; unsupported: false; error: string };

// Validate a configuration with the node's `POST /v1/plugins/apo/check`
// (Wavyzon only). A node without the route (Lavalink, Cadence, a Wavyzon
// built without the plugin) answers 404: `unsupported`.
export async function checkApo(
	node: LavalinkNode,
	config: string
): Promise<ApoCheck> {
	// Same address lavalink-client uses (its `restAddress` getter is private).
	const { secure, host, port } = node.options;
	const base = `http${secure ? "s" : ""}://${host}:${port}`;
	let res: Response;
	try {
		res = await fetch(`${base}/v1/plugins/apo/check`, {
			method: "POST",
			headers: {
				Authorization: node.options.authorization,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ config }),
			signal: AbortSignal.timeout(CHECK_TIMEOUT_MS)
		});
	} catch (e) {
		return {
			ok: false,
			unsupported: false,
			error: `node unreachable (${(e as Error).message})`
		};
	}
	if (res.status === 404) return { ok: false, unsupported: true };
	const body = (await res.json().catch(() => ({}))) as {
		stages?: string[];
		warnings?: string[];
		error?: string;
	};
	if (res.ok) {
		return {
			ok: true,
			stages: body.stages ?? [],
			warnings: body.warnings ?? []
		};
	}
	return {
		ok: false,
		unsupported: false,
		error: body.error ?? `HTTP ${res.status}`
	};
}

// Set (or, with `null`, remove) the APO filter on a player. Other plugin
// filters and the built-in filters are kept. Throws what the node answers.
export async function applyApoFilter(
	player: Player,
	config: string | null
): Promise<void> {
	const data = player.filterManager.data as {
		pluginFilters?: Record<string, unknown>;
	};
	const plugins = { ...(data.pluginFilters ?? {}) };
	if (config === null) {
		if (!("apo" in plugins)) return;
		delete plugins.apo;
	} else {
		plugins.apo = { config };
	}
	data.pluginFilters = plugins;
	await player.filterManager.applyPlayerFilters();
}

// Apply the guild's stored APO filter to a new player. Never throws: a node
// that refuses it (not Wavyzon, file edited since) must not stop playback.
export async function applyGuildApo(player: Player): Promise<void> {
	try {
		const apo = await getGuildApo(player.guildId);
		if (!apo) return;
		await applyApoFilter(player, apo.config);
	} catch (e) {
		logger.warn(
			`[music apo] guild ${player.guildId}: the stored APO filter was not applied (${(e as Error).message})`
		);
	}
}
