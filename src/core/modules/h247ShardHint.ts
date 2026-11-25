/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2026 iHorizon
*/

/**
 * Which shards host a H24/7 server, so they start first after a restart.
 *
 * Discord keeps the voice session of a stopped bot for about 95 s: back
 * inside that window, the H24/7 takeover re-adopts it with no visible
 * leave/join; after it, the bot has to rejoin (the channel's live streak
 * breaks). Shards start one after another (one login every 5 s, plus each
 * shard's ready), so a server on a late shard came back well after the
 * window.
 *
 * The manager has no database (and HorizonDB cannot list the guilds), so
 * each shard writes the ids of its H24/7 servers in a local file,
 * `src/files/h247/{shardId}.json` (one file per shard: never two processes
 * on the same file), and the manager reads them all before spawning. Only an
 * order: a missing or stale file costs a slower start, never a wrong one.
 */
import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import logger from "../logger.js";

export const H247_HINT_DIR = path.join(process.cwd(), "src", "files", "h247");

const WRITE_DEBOUNCE_MS = 2_000;

/** Shard of a guild, Discord's formula: (id >> 22) % shard count. */
export function shardOfGuild(guildId: string, totalShards: number): number {
	return Number((BigInt(guildId) >> 22n) % BigInt(totalShards));
}

/** Guild ids of a hint file, anything else ignored (hand-edited, truncated). */
export function parseHint(contents: string): string[] {
	try {
		const data: unknown = JSON.parse(contents);
		if (!Array.isArray(data)) return [];
		return data.filter(
			(id): id is string =>
				typeof id === "string" && /^\d{17,20}$/.test(id)
		);
	} catch {
		return [];
	}
}

/**
 * Spawn order: shards hosting a H24/7 server first (ascending), then the
 * others (ascending). Always every shard, exactly once.
 */
export function prioritizedShardList(
	totalShards: number,
	h247GuildIds: Iterable<string>
): number[] {
	const first = new Set(h247Shards(totalShards, h247GuildIds));
	const all = Array.from({ length: totalShards }, (_, i) => i);
	return [
		...all.filter((i) => first.has(i)),
		...all.filter((i) => !first.has(i))
	];
}

/** The shards hosting at least one of these guilds, ascending. */
export function h247Shards(
	totalShards: number,
	h247GuildIds: Iterable<string>
): number[] {
	const shards = new Set<number>();
	for (const id of h247GuildIds) shards.add(shardOfGuild(id, totalShards));
	return [...shards].sort((a, b) => a - b);
}

/** Every guild id written by any shard (manager side, before the spawn). */
export async function readH247Hints(
	dir: string = H247_HINT_DIR
): Promise<string[]> {
	let files: string[];
	try {
		files = await readdir(dir);
	} catch {
		return [];
	}

	const ids = new Set<string>();
	for (const file of files) {
		if (!/^\d+\.json$/.test(file)) continue;
		const contents = await readFile(path.join(dir, file), "utf8").catch(
			() => ""
		);
		for (const id of parseHint(contents)) ids.add(id);
	}
	return [...ids];
}

/** The H24/7 servers this shard wrote last time (recovered first at boot). */
export async function readOwnH247Hint(
	shardId: number,
	dir: string = H247_HINT_DIR
): Promise<string[]> {
	const contents = await readFile(
		path.join(dir, `${shardId}.json`),
		"utf8"
	).catch(() => "");
	return parseHint(contents);
}

/** Written atomically (temp file then rename): the manager never reads half a file. */
export async function writeH247Hint(
	shardId: number,
	guildIds: Iterable<string>,
	dir: string = H247_HINT_DIR
): Promise<void> {
	await mkdir(dir, { recursive: true });
	const file = path.join(dir, `${shardId}.json`);
	const tmp = `${file}.${process.pid}.tmp`;
	await writeFile(tmp, JSON.stringify([...guildIds].sort()));
	await rename(tmp, file);
}

/** This process's shard (set by the ShardingManager), 0 when run alone. */
export function currentShardId(): number {
	const raw = process.env.SHARDS;
	const id = raw ? Number(String(raw).split(",")[0]) : 0;
	return Number.isInteger(id) && id >= 0 ? id : 0;
}

/**
 * A Map of the enabled H24/7 sessions (guild id → voice channel id) that
 * rewrites this shard's hint file, debounced, whenever its set of guilds
 * changes. The boot recovery fills it in one go: one write.
 */
export class H247SessionMap extends Map<string, string> {
	private timer: ReturnType<typeof setTimeout> | null = null;

	constructor(
		private readonly write: (ids: string[]) => Promise<void> = (ids) =>
			writeH247Hint(currentShardId(), ids)
	) {
		super();
	}

	override set(guildId: string, channelId: string): this {
		const added = !this.has(guildId);
		super.set(guildId, channelId);
		if (added) this.scheduleWrite();
		return this;
	}

	override delete(guildId: string): boolean {
		const removed = super.delete(guildId);
		if (removed) this.scheduleWrite();
		return removed;
	}

	/** Writes now (tests, and nothing pending is lost on a quick restart). */
	async flush(): Promise<void> {
		if (this.timer) clearTimeout(this.timer);
		this.timer = null;
		await this.write([...this.keys()]);
	}

	private scheduleWrite(): void {
		if (this.timer) clearTimeout(this.timer);
		this.timer = setTimeout(() => {
			this.timer = null;
			this.write([...this.keys()]).catch((error) => {
				logger.err("Failed to write the H24/7 shard hint:", error);
			});
		}, WRITE_DEBOUNCE_MS);
		this.timer.unref?.();
	}
}
