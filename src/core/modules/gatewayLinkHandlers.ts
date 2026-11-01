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
	BaseGuildTextChannel,
	ChannelType,
	Client,
	Guild,
	GuildTextBasedChannel,
	Message,
	PermissionFlagsBits
} from "discord.js";

import { GatewayLink } from "../../../types/gateway_link.js";
import { DatabaseStructure } from "../../../types/database_structure.js";
import {
	ensureH247VoicePresence,
	forgetH247Session,
	leaveCurrentVoiceConnection
} from "./h247Manager.js";
import {
	deleteStickyChannelMessage,
	queueStickyChannelRefresh
} from "./stickyMessageManager.js";
import { sendTrapEmbed } from "./honeypotManager.js";
import { getTTSData } from "./ttsManager.js";
import { sendConfessionPanel } from "./confessionManager.js";

type Schema = DatabaseStructure.DbGuildObject;

// Button entries of a reaction-role message: no reaction to add.
const REACTION_BUTTON_PREFIX = "button_reaction%";
// Channels probed to find a reaction-role message (its channel is not stored).
const MESSAGE_LOOKUP_MAX_CHANNELS = 50;

function textChannel(guild: Guild, id?: string | null) {
	const channel = id ? guild.channels.cache.get(id) : undefined;
	return channel instanceof BaseGuildTextChannel &&
		channel.type === ChannelType.GuildText
		? channel
		: null;
}

// The gateway checked the dashboard rights; anything the bot posts in a
// channel is also re-checked against the author's own channel permissions.
async function assertActorCanSend(
	guild: Guild,
	channel: BaseGuildTextChannel,
	actorId: string
): Promise<void> {
	const member = await guild.members.fetch(actorId).catch(() => null);
	const allowed = member
		?.permissionsIn(channel.id)
		.has([
			PermissionFlagsBits.ViewChannel,
			PermissionFlagsBits.SendMessages
		]);
	if (!allowed) throw "you cannot send messages in this channel";
}

async function findGuildMessage(
	guild: Guild,
	messageId: string
): Promise<Message | null> {
	const me = guild.members.me;
	if (!me) return null;

	const channels = guild.channels.cache
		.filter(
			(c): c is GuildTextBasedChannel =>
				c.isTextBased() &&
				me
					.permissionsIn(c)
					.has([
						PermissionFlagsBits.ViewChannel,
						PermissionFlagsBits.ReadMessageHistory
					])
		)
		.first(MESSAGE_LOOKUP_MAX_CHANNELS);

	for (const channel of channels) {
		const message = await channel.messages
			.fetch(messageId)
			.catch(() => null);
		if (message) return message;
	}
	return null;
}

// Side effects of a dashboard config change, keyed by section path. The
// database already holds the new value: handlers only apply what the
// matching slash command does on top of its write, through the same
// functions, and must be idempotent (a change can be replayed). Sections
// read lazily by the bot have no handler and need none.
type ChangeHandler = (
	client: Client,
	guild: Guild,
	change: GatewayLink.ConfigChange,
	actorId: string
) => Promise<void>;

const handlers: Record<string, ChangeHandler> = {
	// /h247 join · /h247 leave
	"GUILD.H247": async (client, guild, change) => {
		const next = change.new as DatabaseStructure.H247Schema | null;
		const prev = change.old as DatabaseStructure.H247Schema | null;

		if (next?.enabled && next.voiceChannelId) {
			// Same guards as /h247 join. The dashboard already wrote the
			// section: on conflict it is reverted, otherwise the watchdog
			// would join a minute later anyway.
			const player = client.player.getPlayer(guild.id);
			const tts = await getTTSData(client, guild.id);
			const conflict = player?.playing
				? "music is playing in this server"
				: tts?.enabled && tts.voiceChannelId !== next.voiceChannelId
					? "text-to-speech is active in another channel"
					: null;
			if (conflict) {
				const path = `${guild.id}.GUILD.H247`;
				if (prev) await client.db.set(path, prev);
				else await client.db.delete(path);
				throw `${conflict}, H24/7 not changed`;
			}

			forgetH247Session(guild.id);
			// TTS on the same channel owns the connection: adopt it.
			if (player && !tts?.enabled) await player.destroy().catch(() => {});
			const joined = await ensureH247VoicePresence(client, guild.id);
			if (!joined) throw "unable to join the voice channel";
			return;
		}

		forgetH247Session(guild.id);
		await client.db
			.delete(`${guild.id}.GUILD.H247_TAKEOVER`)
			.catch(() => {});

		if (
			prev?.enabled &&
			guild.members.me?.voice.channelId === prev.voiceChannelId &&
			!client.player.getPlayer(guild.id)
		) {
			await leaveCurrentVoiceConnection(guild);
		}
	},

	// /custom name · /custom avatar (`reset` restores the global profile)
	BOT: async (client, guild, change) => {
		const prev = (change.old ?? {}) as DatabaseStructure.DbGuildBotObject;
		const next = (change.new ?? {}) as DatabaseStructure.DbGuildBotObject;
		const profile = client.func.customProfileHelper;

		if (prev.botName !== next.botName) {
			if (next.botName && next.botName.length >= 32)
				throw "the bot name must be shorter than 32 characters";
			const ok = await profile.changeGuildBotName(
				guild,
				next.botName || client.user!.displayName
			);
			if (!ok) throw "unable to change the bot name";
		}

		if (prev.botPFP !== next.botPFP) {
			let base64 = next.botPFP;
			if (!base64) {
				const res = await fetch(
					client.user!.displayAvatarURL({
						size: 4096,
						extension: "png"
					})
				);
				base64 = Buffer.from(await res.arrayBuffer()).toString(
					"base64"
				);
			}
			const ok = await profile.changeGuildBotAvatar(
				guild,
				`data:image/png;base64,${base64}`
			);
			if (!ok) throw "unable to change the bot avatar";
		}
	},

	// Periodic manager; refreshed now instead of at the next 5 min tick.
	"GUILD.MCOUNT": async (client, guild, change) => {
		const prev = (change.old ?? {}) as Record<string, unknown>;
		const next = (change.new ?? {}) as Record<string, unknown>;
		const changed = Object.keys(next).filter(
			(k) => JSON.stringify(prev[k]) !== JSON.stringify(next[k])
		);
		// Not awaited (like /membercount): Discord allows 2 renames per 10 min
		// per channel, a queued rename would outlast the gateway ack.
		if (changed.length)
			void client.memberCountManager
				.refreshGuild(guild.id, changed)
				.catch(() => {});
	},

	// /sticky text · /sticky embed · /sticky disable
	STICKY: async (client, guild, change, actorId) => {
		const prev = (change.old ?? {}) as DatabaseStructure.StickySchema;
		const next = (change.new ?? {}) as DatabaseStructure.StickySchema;
		const failed: string[] = [];

		for (const channelId of new Set([
			...Object.keys(prev),
			...Object.keys(next)
		])) {
			const before = prev[channelId];
			const after = next[channelId];
			const channel = textChannel(guild, channelId);
			if (!channel) continue;

			if (before?.enabled && !after?.enabled) {
				await deleteStickyChannelMessage(channel, before.lastMessageId);
				continue;
			}

			// `lastMessageId` alone moving is the bot's own repost.
			if (
				after?.enabled &&
				(!before?.enabled ||
					before.content !== after.content ||
					before.embedId !== after.embedId)
			) {
				await assertActorCanSend(guild, channel, actorId);
				const result = await queueStickyChannelRefresh(client, channel);
				if (result.status !== "sent") {
					failed.push(`#${channel.name}: ${result.status}`);
				}
			}
		}

		if (failed.length) throw failed.join(", ");
	},

	// /reactionroles add · /reactionroles remove (reaction entries only)
	"GUILD.REACTION_ROLES": async (client, guild, change) => {
		const prev = (change.old ?? {}) as Schema["REACTION_ROLES"] & object;
		const next = (change.new ?? {}) as Schema["REACTION_ROLES"] & object;
		const failed: string[] = [];

		for (const messageId of new Set([
			...Object.keys(prev),
			...Object.keys(next)
		])) {
			const before = (prev[messageId] ?? {}) as Record<string, unknown>;
			const after = (next[messageId] ?? {}) as Record<string, unknown>;
			const isReaction = (key: string) =>
				!key.startsWith(REACTION_BUTTON_PREFIX);
			const added = Object.keys(after).filter(
				(k) => isReaction(k) && !(k in before)
			);
			const removed = Object.keys(before).filter(
				(k) => isReaction(k) && !(k in after)
			);
			if (!added.length && !removed.length) continue;

			const message = await findGuildMessage(guild, messageId);
			if (!message) {
				// Nothing left to clean up when only removing.
				if (added.length) failed.push(`message ${messageId} not found`);
				continue;
			}

			for (const emoji of added) {
				// The bot stores custom emojis by id (/reactionroles add).
				if (/[<>:]/.test(emoji)) {
					failed.push(`use the emoji id instead of ${emoji}`);
					continue;
				}
				await message
					.react(emoji)
					.catch(() => failed.push(`cannot react with ${emoji}`));
			}
			for (const emoji of removed) {
				await message.reactions.cache
					.get(emoji)
					?.users.remove(client.user!.id)
					.catch(() => {});
			}
		}

		if (failed.length) throw failed.join(", ");
	},

	// /honeypot config (toggle on / trap channel change → trap message)
	"GUILD.HONEYPOT": async (client, guild, change) => {
		const prev = change.old as DatabaseStructure.HoneypotSchema | null;
		const next = change.new as DatabaseStructure.HoneypotSchema | null;
		if (!next?.enabled) return;

		const channelMoved = prev?.channelId !== next.channelId;
		if (prev?.enabled && !channelMoved && next.messageId) return;
		if (!next.logsChannelId) throw "a logs channel is required";

		// Rebuilt from the database: it is the source of truth.
		const path = `${guild.id}.GUILD.HONEYPOT`;
		const config = (await client.db.get(
			path
		)) as DatabaseStructure.HoneypotSchema | null;
		if (!config?.enabled) return;
		if (channelMoved) config.messageId = undefined;

		const lang = await client.func.getLanguageData(guild.id);
		const channel = await sendTrapEmbed(guild, config, lang);
		if (!channel) throw "unable to post the trap message";

		await client.db.set(path, config);
	},

	// /confession channel (a new panel channel without an explicit message)
	"GUILD.CONFESSION": async (client, guild, change, actorId) => {
		type Panel = { channelId?: string; messageId?: string } | undefined;
		const prev = (change.old as { panel?: Panel } | null)?.panel;
		const next = (change.new as { panel?: Panel } | null)?.panel;

		if (!next?.channelId || next.channelId === prev?.channelId) return;
		// Pointing at an existing message: nothing to post.
		if (next.messageId && next.messageId !== prev?.messageId) return;

		const channel = textChannel(guild, next.channelId);
		if (!channel) throw "panel channel not found";
		await assertActorCanSend(guild, channel, actorId);

		const lang = await client.func.getLanguageData(guild.id);
		const message = await sendConfessionPanel(
			client,
			channel,
			lang,
			"+",
			guild
		);
		await client.db.set(`${guild.id}.GUILD.CONFESSION.panel`, {
			channelId: message.channelId,
			messageId: message.id
		});
	},

	// /setserverlang
	"GUILD.LANG": async (client, guild, change) => {
		const lang = (change.new as DatabaseStructure.DbGuildObject["LANG"])
			?.lang;
		if (!lang) return;

		const ok = await client.func.customProfileHelper.applyLanguageBio(
			guild,
			lang
		);
		if (!ok) throw "unable to update the server bio";
	}
};

export async function applyConfigChanges(
	client: Client,
	event: GatewayLink.ConfigUpdatedEvent
): Promise<GatewayLink.ChangeResult[]> {
	const guild = client.guilds.cache.get(event.guildId);
	if (!guild) throw "guild not in this shard";

	const results: GatewayLink.ChangeResult[] = [];

	for (const change of event.changes) {
		const handler = handlers[change.path];
		if (!handler) continue;

		try {
			await handler(client, guild, change, event.actorId);
			results.push({ path: change.path, ok: true });
		} catch (error) {
			results.push({
				path: change.path,
				ok: false,
				error: error instanceof Error ? error.message : String(error)
			});
		}
	}

	return results;
}
