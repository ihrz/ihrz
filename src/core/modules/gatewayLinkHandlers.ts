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
	ActionRowBuilder,
	BaseGuildTextChannel,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	Client,
	Guild,
	GuildTextBasedChannel,
	Message,
	PermissionFlagsBits,
	VoiceChannel
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
import {
	getTTSData,
	startTTSSession,
	stopTTSSession,
	deleteTTSData
} from "./ttsManager.js";
import { getH247Data } from "./h247Manager.js";
import { sendConfessionPanel } from "./confessionManager.js";
import { generateSelectMenu } from "../functions/roleSelectMenu.js";
import { createOauth2LinkWithGuild } from "../functions/authRestoreHelper.js";
import { authRestoreTable } from "../../Events/client/ready.js";
import { applyApoFilter, checkApo } from "./musicApo.js";
import { activeConfig, migrate } from "./musicApoState.js";

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

// Drops the components whose custom id is `customId`; empty rows go.
async function removeComponent(message: Message, customId: string) {
	const rows = message.components
		.map((row) => {
			const json = row.toJSON() as {
				type: number;
				components: { custom_id?: string }[];
			};
			return {
				...json,
				components: json.components.filter(
					(c) => c.custom_id !== customId
				)
			};
		})
		.filter((row) => row.components.length > 0);
	await message.edit({ components: rows as never });
}

function hasComponent(message: Message, customId: string): boolean {
	return message.components.some((row) =>
		(
			row.toJSON() as { components: { custom_id?: string }[] }
		).components.some((c) => c.custom_id === customId)
	);
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
			// Button entries: `button_reaction%{roleId}` (the dashboard renames
			// its placeholder keys once a role is picked).
			const isButton = (key: string) =>
				/^\d{17,20}$/.test(key.slice(REACTION_BUTTON_PREFIX.length)) &&
				key.startsWith(REACTION_BUTTON_PREFIX);
			const added = Object.keys(after).filter(
				(k) => isReaction(k) && !(k in before)
			);
			const removed = Object.keys(before).filter(
				(k) => isReaction(k) && !(k in after)
			);
			const addedButtons = Object.keys(after).filter(
				(k) => isButton(k) && !(k in before)
			);
			const removedButtons = Object.keys(before).filter(
				(k) => isButton(k) && !(k in after)
			);
			if (
				!added.length &&
				!removed.length &&
				!addedButtons.length &&
				!removedButtons.length
			)
				continue;

			const message = await findGuildMessage(guild, messageId);
			if (!message) {
				// Nothing left to clean up when only removing.
				if (added.length || addedButtons.length)
					failed.push(`message ${messageId} not found`);
				continue;
			}

			// /rolebutton: buttons only on the bot's own messages.
			if (addedButtons.length || removedButtons.length) {
				if (message.author.id !== client.user!.id) {
					failed.push(`message ${messageId} was not sent by the bot`);
				} else {
					for (const key of removedButtons) {
						if (hasComponent(message, key))
							await removeComponent(message, key).catch(() =>
								failed.push(
									`cannot remove a button from ${messageId}`
								)
							);
					}
					for (const key of addedButtons) {
						if (hasComponent(message, key)) continue;
						const emoji = (after[key] as { reactionNAME?: string })
							?.reactionNAME;
						const button = new ButtonBuilder()
							.setStyle(ButtonStyle.Secondary)
							.setCustomId(key);
						if (emoji) button.setEmoji(emoji);
						await client.func.method
							.buttonReact(message, button)
							.catch(() =>
								failed.push(
									`cannot add a button to ${messageId}`
								)
							);
					}
				}
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

	// /roleselect: the select menu on the target message mirrors the saved
	// options (removed message → menu removed).
	"GUILD.ROLE_SELECT": async (client, guild, change) => {
		type Options = DatabaseStructure.RoleReactData;
		const prev = (change.old ?? {}) as Record<string, Options>;
		const next = (change.new ?? {}) as Record<string, Options>;
		const lang = await client.func.getLanguageData(guild.id);
		const failed: string[] = [];

		for (const messageId of new Set([
			...Object.keys(prev),
			...Object.keys(next)
		])) {
			const options = (next[messageId] ?? []).filter(
				(o) => o?.roleId && o.label
			);
			if (
				JSON.stringify(prev[messageId] ?? []) ===
				JSON.stringify(next[messageId] ?? [])
			)
				continue;
			const message = await findGuildMessage(guild, messageId);
			if (!message) {
				if (options.length)
					failed.push(`message ${messageId} not found`);
				continue;
			}
			if (message.author.id !== client.user!.id) {
				failed.push(`message ${messageId} was not sent by the bot`);
				continue;
			}
			const components = options.length
				? [
						new ActionRowBuilder<
							ReturnType<typeof generateSelectMenu>
						>().addComponents(
							generateSelectMenu(
								options,
								messageId,
								lang.roleselect_default_placeholder
							)
						)
					]
				: [];
			await message
				.edit({ components })
				.catch(() =>
					failed.push(`cannot update the menu of ${messageId}`)
				);
		}

		if (failed.length) throw failed.join(", ");
	},

	// /blacklist · /unblacklist. An absent user is banned too: same outcome as
	// the ban on join, without waiting for it.
	BLACKLIST: async (client, guild, change) => {
		type Entry = { blacklisted?: boolean; reason?: string };
		const prev = (change.old ?? {}) as Record<string, Entry>;
		const next = (change.new ?? {}) as Record<string, Entry>;
		const listed = (entry?: Entry) => entry?.blacklisted === true;
		const failed: string[] = [];

		for (const id of new Set([
			...Object.keys(prev),
			...Object.keys(next)
		])) {
			if (listed(next[id]) && !listed(prev[id])) {
				if (id === client.user?.id) continue;
				await guild.members
					.ban(id, { reason: next[id].reason || "blacklisted!" })
					.catch(() => failed.push(`cannot ban ${id}`));
			} else if (listed(prev[id]) && !listed(next[id])) {
				await guild.members.unban(id).catch(() => {});
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

	// /tempban (add) · early unban (entry removed). Same guards as the
	// command; a refused ban is removed from the database again so the
	// manager never "expires" a ban that was not applied.
	"GUILD.TEMPBAN": async (client, guild, change) => {
		const prev = (change.old ?? {}) as DatabaseStructure.TempbanSchema;
		const next = (change.new ?? {}) as DatabaseStructure.TempbanSchema;
		const me = guild.members.me;
		const failed: string[] = [];
		const refused: string[] = [];

		for (const userId of Object.keys(next)) {
			if (userId in prev) continue;
			if (!me?.permissions.has(PermissionFlagsBits.BanMembers)) {
				refused.push(userId);
				failed.push("missing Ban Members permission");
				continue;
			}
			const member = await guild.members.fetch(userId).catch(() => null);
			if (
				member &&
				(member.roles.highest.position >= me.roles.highest.position ||
					member.permissions.has(PermissionFlagsBits.Administrator))
			) {
				refused.push(userId);
				failed.push(
					`cannot ban ${userId} (role too high or administrator)`
				);
				continue;
			}
			const reason = next[userId]?.reason || "No reason provided";
			const ok = await guild.members
				.ban(userId, { reason })
				.then(() => true)
				.catch(() => false);
			if (!ok) {
				refused.push(userId);
				failed.push(`cannot ban ${userId}`);
			}
		}

		for (const userId of Object.keys(prev)) {
			if (userId in next) continue;
			await guild.members.unban(userId).catch(() => {});
		}

		if (refused.length) {
			const path = `${guild.id}.GUILD.TEMPBAN`;
			const stored = ((await client.db.get(path)) ??
				{}) as DatabaseStructure.TempbanSchema;
			for (const userId of refused) delete stored[userId];
			await client.db.set(path, stored);
		}
		if (failed.length) throw failed.join(", ");
	},

	// /temprole (add) · early removal (entry removed). Same guards as the
	// command; a refused role is removed from the database again.
	"GUILD.TEMPROLE": async (client, guild, change) => {
		type Entries = Record<string, { roleId: string; time: number }[]>;
		const prev = (change.old ?? {}) as Entries;
		const next = (change.new ?? {}) as Entries;
		const has = (e: Entries, member: string, role: string) =>
			(e[member] ?? []).some((r) => r?.roleId === role);
		const me = guild.members.me;
		const failed: string[] = [];
		const refused: [string, string][] = [];

		for (const [memberId, roles] of Object.entries(next)) {
			for (const { roleId } of roles ?? []) {
				if (!roleId || has(prev, memberId, roleId)) continue;
				const member = await guild.members
					.fetch(memberId)
					.catch(() => null);
				const role = guild.roles.cache.get(roleId);
				if (
					!me?.permissions.has(PermissionFlagsBits.ManageRoles) ||
					!member ||
					!role ||
					member.roles.highest.position >=
						me.roles.highest.position ||
					role.position >= me.roles.highest.position
				) {
					refused.push([memberId, roleId]);
					failed.push(`cannot give role ${roleId} to ${memberId}`);
					continue;
				}
				const ok = await member.roles
					.add(role, "Dashboard temporary role")
					.then(() => true)
					.catch(() => false);
				if (!ok) {
					refused.push([memberId, roleId]);
					failed.push(`cannot give role ${roleId} to ${memberId}`);
				}
			}
		}

		for (const [memberId, roles] of Object.entries(prev)) {
			for (const { roleId } of roles ?? []) {
				if (!roleId || has(next, memberId, roleId)) continue;
				const member = await guild.members
					.fetch(memberId)
					.catch(() => null);
				await member?.roles.remove(roleId).catch(() => {});
			}
		}

		if (refused.length) {
			const path = `${guild.id}.GUILD.TEMPROLE`;
			const stored = ((await client.db.get(path)) ?? {}) as Entries;
			for (const [memberId, roleId] of refused) {
				stored[memberId] = (stored[memberId] ?? []).filter(
					(r) => r?.roleId !== roleId
				);
				if (!stored[memberId].length) delete stored[memberId];
			}
			await client.db.set(path, stored);
		}
		if (failed.length) throw failed.join(", ");
	},

	// /tts join · /tts leave (enable, channel change, disable). Same guards
	// as the command; the dashboard write is reverted on conflict.
	"GUILD.TTS": async (client, guild, change) => {
		type TTS = DatabaseStructure.TTSData;
		const prev = change.old as TTS | null;
		const next = change.new as TTS | null;
		const path = `${guild.id}.GUILD.TTS`;
		const revert = async (why: string) => {
			if (prev) await client.db.set(path, prev);
			else await client.db.delete(path);
			throw `${why}, text-to-speech not changed`;
		};

		const wasOn = !!prev?.enabled && !!prev.voiceChannelId;
		const isOn = !!next?.enabled && !!next.voiceChannelId;
		const moved = prev?.voiceChannelId !== next?.voiceChannelId;
		if (wasOn === isOn && !moved) return;

		if (!isOn) {
			if (wasOn) await stopTTSSession(client, guild.id, prev!);
			await deleteTTSData(client, guild.id);
			return;
		}

		const channel = guild.channels.cache.get(next!.voiceChannelId);
		if (!(channel instanceof VoiceChannel))
			return revert("voice channel not found");
		const music = client.player.getPlayer(guild.id);
		if (!wasOn && music?.playing)
			return revert("music is playing in this server");
		const h247 = await getH247Data(client, guild.id);
		if (h247?.enabled && h247.voiceChannelId !== channel.id)
			return revert("H24/7 is active in another channel");

		if (wasOn) await stopTTSSession(client, guild.id, prev!);
		const lang = await client.func.getLanguageData(guild.id);
		await startTTSSession(
			client,
			guild,
			channel,
			lang,
			next!.lang || lang.tts_join_lang_fallback || "en-US",
			next!.textChannelId || channel.id
		).catch(() => revert("unable to join the voice channel"));
	},

	// /authrestore set: verify button on the target message. The AuthRestore
	// itself (role, security code) is created by the command only — the
	// dashboard can move the button, not create a restore without a role.
	"GUILD.RESTORECORD": async (client, guild, change) => {
		type Record = { channelId?: string; messageId?: string };
		const prev = (change.old ?? {}) as Record;
		const next = (change.new ?? {}) as Record;
		if (
			!next.messageId ||
			(prev.messageId === next.messageId &&
				prev.channelId === next.channelId)
		)
			return;

		const restore = (await authRestoreTable?.get(guild.id)) as {
			config?: { roleId?: string };
		} | null;
		if (!restore?.config?.roleId)
			throw "set up AuthRestore with /authrestore set first (a role is required)";

		const channel = guild.channels.cache.get(next.channelId ?? "");
		const message =
			channel?.isTextBased() && "messages" in channel
				? await channel.messages.fetch(next.messageId).catch(() => null)
				: await findGuildMessage(guild, next.messageId);
		if (!message) throw "message not found";
		if (message.author.id !== client.user!.id)
			throw "the message must be sent by the bot";

		const lang = await client.func.getLanguageData(guild.id);
		const link = createOauth2LinkWithGuild({
			guildId: guild.id,
			clientId: client.user!.id,
			scope: "identify+guilds+guilds.join"
		});
		await message.edit({
			components: [
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setStyle(ButtonStyle.Link)
						.setLabel(lang.rc_verify)
						.setURL(link)
				)
			]
		});
	},

	// /music apo panel: the gateway already applied the panel's rules (limits,
	// frozen configs, stamped authors). New or replaced files are checked by
	// the music node like in the panel; a refused file reverts the write.
	// Then the playing music follows the applied config.
	MUSIC_APO: async (client, guild, change) => {
		const prev = migrate(change.old);
		const next = migrate(change.new);
		const path = `${guild.id}.MUSIC_APO`;
		const revert = async (why: string) => {
			if (change.old) await client.db.set(path, change.old);
			else await client.db.delete(path);
			throw `${why}, Equalizer APO configs not changed`;
		};

		const player = client.player.getPlayer(guild.id);
		const changed = next.configs.filter(
			(c) => prev.configs.find((p) => p.id === c.id)?.config !== c.config
		);
		if (changed.length) {
			const node =
				player?.node ??
				client.player.nodeManager.leastUsedNodes("playingPlayers")[0];
			if (!node) return revert("no audio node is connected");
			for (const config of changed) {
				const check = await checkApo(node, config.config);
				if (check.ok) continue;
				return revert(
					check.unsupported
						? "the music node does not support Equalizer APO"
						: `"${config.name}": ${check.error.slice(0, 300)}`
				);
			}
		}

		const was = activeConfig(prev)?.config ?? null;
		const now = activeConfig(next)?.config ?? null;
		if (player && was !== now) await applyApoFilter(player, now);
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
