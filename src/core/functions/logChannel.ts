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

/**
 * Where a log goes. Every log type reads its channel here (`GUILD.SERVER_LOGS.<type>`, `GUILD.TICKET.logs` for
 * tickets), and a FORUM channel works too: each log type then gets its own post in that forum, named after the
 * type in the server's language ("Moderation Logs"…), created at the first log and remembered in
 * `GUILD.LOG_POSTS.<forumId>.<type>`. An archived post is reopened; a forum that requires a tag gets its first one.
 *
 *   const channel = await client.func.logChannel.getLogChannel(guild, "moderation");
 *   if (!channel) return;
 */
import {
	ChannelFlags,
	ChannelType,
	type ForumChannel,
	type Guild,
	type GuildBasedChannel,
	type GuildTextBasedChannel
} from "discord.js";

import { LanguageData } from "../../../types/languageData.js";

export type LogType =
	| "roles"
	| "moderation"
	| "voice"
	| "message"
	| "boosts"
	| "antispam"
	| "channel"
	| "confession"
	| "economy"
	| "ticket";

/** The name of each type's post: the label `/setlogschannel` already shows. */
const POST_NAME: Record<LogType, keyof LanguageData> = {
	roles: "setlogschannel_var_roles",
	moderation: "setlogschannel_var_mods",
	voice: "setlogschannel_var_voice",
	message: "setlogschannel_var_msg",
	boosts: "setlogschannel_var_boost",
	antispam: "setlogschannel_var_antispam",
	channel: "setlogschannel_var_channel",
	confession: "setlogschannel_var_confession",
	economy: "setlogschannel_var_economy",
	ticket: "setlogschannel_var_tickets"
};

/** Where each type's channel id is stored. */
export function logChannelPath(guildId: string, type: LogType): string {
	return type === "ticket"
		? `${guildId}.GUILD.TICKET.logs`
		: `${guildId}.GUILD.SERVER_LOGS.${type}`;
}

/** The configured channel itself (a forum stays a forum), or null when unset or gone. */
export async function getConfiguredLogChannel(
	guild: Guild,
	type: LogType
): Promise<GuildBasedChannel | null> {
	const id = (await guild.client.db.get(logChannelPath(guild.id, type))) as
		string | null;
	if (!id) return null;
	return (
		guild.channels.cache.get(id) ??
		(await guild.channels.fetch(id).catch(() => null))
	);
}

// One post creation at a time per forum and type: two logs at once must not open two posts.
const creating = new Map<string, Promise<GuildTextBasedChannel | null>>();

/** The post of `type` in `forum`: the remembered one (reopened if archived), else a new one. */
async function forumPost(
	forum: ForumChannel,
	type: LogType
): Promise<GuildTextBasedChannel | null> {
	const guild = forum.guild;
	const path = `${guild.id}.GUILD.LOG_POSTS.${forum.id}.${type}`;
	const lockKey = `${forum.id}:${type}`;
	const pending = creating.get(lockKey);
	if (pending) return pending;

	const task = (async () => {
		const knownId = (await guild.client.db.get(path)) as string | null;
		if (knownId) {
			const known =
				forum.threads.cache.get(knownId) ??
				(await forum.threads.fetch(knownId).catch(() => null));
			if (known && known.parentId === forum.id) {
				if (known.archived)
					await known.setArchived(false).catch(() => null);
				if (!known.archived) return known;
			}
		}

		const lang = await guild.client.func.getLanguageData(guild.id);
		const name = String(lang[POST_NAME[type]]).slice(0, 100);
		const requiresTag = forum.flags.has(ChannelFlags.RequireTag);
		const post = await forum.threads
			.create({
				name,
				message: {
					content: lang.logs_forum_post_intro.replace(
						"${logType}",
						name
					)
				},
				appliedTags:
					requiresTag && forum.availableTags[0]
						? [forum.availableTags[0].id]
						: undefined,
				reason: "iHorizon logs"
			})
			.catch(() => null);
		if (!post) return null;
		await guild.client.db.set(path, post.id);
		return post;
	})();

	creating.set(lockKey, task);
	try {
		return await task;
	} finally {
		creating.delete(lockKey);
	}
}

/**
 * The channel a log of `type` is sent to: the configured text channel, or its post when the channel is a forum.
 * Null when no channel is set, it is gone, or the bot cannot write there.
 */
export async function getLogChannel(
	guild: Guild,
	type: LogType
): Promise<GuildTextBasedChannel | null> {
	const channel = await getConfiguredLogChannel(guild, type);
	if (!channel) return null;
	if (channel.type === ChannelType.GuildForum)
		return forumPost(channel as ForumChannel, type);
	return channel.isTextBased() ? (channel as GuildTextBasedChannel) : null;
}
