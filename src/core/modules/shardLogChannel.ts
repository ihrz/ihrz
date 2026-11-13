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

// Shard events (ready, reconnecting, resumed, disconnected, died...) posted as
// plain text in the channel of SHARD_LOGS_CHANNEL_ID, from the manager process
// (no client there: Discord's REST API with the bot token). Lines are grouped
// for a few seconds, so a wave of reconnections is one or two messages and
// stays far below the channel's rate limit. A failed post is only logged: the
// shards never wait on it.

import { REST, Routes } from "discord.js";

import logger from "../logger.js";

const FLUSH_MS = 3000;
const MAX_CONTENT = 2000;
// Lines waiting while Discord is unreachable: the oldest are dropped past this.
const MAX_PENDING = 200;

/** Lines packed into messages of at most `max` characters, in order. */
export function packLines(lines: string[], max = MAX_CONTENT): string[] {
	const out: string[] = [];
	let cur = "";
	for (const raw of lines) {
		const line = raw.length > max ? raw.slice(0, max - 1) + "…" : raw;
		if (cur && cur.length + 1 + line.length > max) {
			out.push(cur);
			cur = "";
		}
		cur = cur ? `${cur}\n${line}` : line;
	}
	if (cur) out.push(cur);
	return out;
}

export type ShardLog = (line: string) => void;

/** A sender for `channelId`; nothing is sent (no-op) without a channel or token. */
export function createShardLog(
	token: string | undefined,
	channelId: string | undefined,
	post?: (content: string) => Promise<unknown>,
	flushMs = FLUSH_MS
): ShardLog {
	if (!channelId || !/^\d{17,20}$/.test(channelId)) return () => {};
	if (!post) {
		if (!token) return () => {};
		const rest = new REST({ version: "10" }).setToken(token);
		post = (content) =>
			rest.post(Routes.channelMessages(channelId), {
				body: { content, allowed_mentions: { parse: [] } }
			});
	}
	const send = post;
	let pending: string[] = [];
	let timer: ReturnType<typeof setTimeout> | null = null;

	const flush = async () => {
		timer = null;
		const lines = pending;
		pending = [];
		for (const content of packLines(lines)) {
			try {
				await send(content);
			} catch (error) {
				logger.warn(
					`Shard log channel: could not post (${(error as Error).message})`
				);
				return;
			}
		}
	};

	return (line) => {
		pending.push(`${line} · <t:${Math.floor(Date.now() / 1000)}:T>`);
		if (pending.length > MAX_PENDING)
			pending.splice(0, pending.length - MAX_PENDING);
		timer ??= setTimeout(() => void flush(), flushMs);
	};
}
