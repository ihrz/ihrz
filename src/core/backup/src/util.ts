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

import type {
	BackupData,
	CategoryData,
	ChannelPermissionsData,
	CreateOptions,
	LoadOptions,
	MessageData,
	TextChannelData,
	ThreadChannelData,
	VoiceChannelData
} from "./types";

import {
	AttachmentBuilder,
	CategoryChannel,
	ChannelType,
	ForumChannel,
	Guild,
	GuildFeature,
	GuildPremiumTier,
	Message,
	NewsChannel,
	OverwriteData,
	OverwriteType,
	Snowflake,
	StageChannel,
	TextChannel,
	ThreadChannel,
	VoiceChannel,
	Webhook,
	type GuildChannelCreateOptions,
	type WebhookMessageCreateOptions
} from "discord.js";
import { surplusRoleNames, type BackupComponent } from "./components";
import { getBans } from "./create";

const REASON = "[Backup System]";

const MaxBitratePerTier: Record<number, number> = {
	[GuildPremiumTier.None]: 96000,
	[GuildPremiumTier.Tier1]: 128000,
	[GuildPremiumTier.Tier2]: 256000,
	[GuildPremiumTier.Tier3]: 384000
};

export function fetchChannelPermissions(
	channel:
		| TextChannel
		| VoiceChannel
		| CategoryChannel
		| NewsChannel
		| StageChannel,
	options?: CreateOptions
) {
	const permissions: ChannelPermissionsData[] = [];
	if (options?.components && !options.components.includes("permissions")) {
		return permissions;
	}
	for (const perm of channel.permissionOverwrites.cache.values()) {
		const allow = perm.allow.bitfield.toString();
		const deny = perm.deny.bitfield.toString();
		if (perm.type === OverwriteType.Member) {
			permissions.push({ roleName: "", userId: perm.id, allow, deny });
			continue;
		}
		const role = channel.guild.roles.cache.get(perm.id);
		if (role) permissions.push({ roleName: role.name, allow, deny });
	}
	return permissions;
}

/** Roles match by name, members by id; anyone no longer here is dropped. */
export async function buildOverwrites(
	permissions: ChannelPermissionsData[],
	guild: Guild
): Promise<OverwriteData[]> {
	const overwrites: OverwriteData[] = [];
	// Two roles can share a name: each one is only used once.
	const usedRoles = new Set<string>();
	for (const perm of permissions) {
		const allow = BigInt(perm.allow);
		const deny = BigInt(perm.deny);
		if (perm.userId) {
			const member = await guild.members
				.fetch(perm.userId)
				.catch(() => null);
			if (member) {
				overwrites.push({
					id: member.id,
					allow,
					deny,
					type: OverwriteType.Member
				});
			}
			continue;
		}
		const role = guild.roles.cache.find(
			(r) => r.name === perm.roleName && !usedRoles.has(r.id)
		);
		if (role) {
			usedRoles.add(role.id);
			overwrites.push({
				id: role.id,
				allow,
				deny,
				type: OverwriteType.Role
			});
		}
	}
	return overwrites;
}

function voiceData(
	channel: VoiceChannel | StageChannel,
	type: VoiceChannelData["type"],
	options?: CreateOptions
): VoiceChannelData {
	return {
		type,
		name: channel.name,
		bitrate: channel.bitrate,
		userLimit: channel.userLimit,
		parent: channel.parent ? channel.parent.name : null,
		permissions: fetchChannelPermissions(channel, options),
		rtcRegion: channel.rtcRegion,
		videoQualityMode: channel.videoQualityMode,
		nsfw: channel.nsfw,
		rateLimitPerUser: channel.rateLimitPerUser
	};
}

export async function fetchVoiceChannelData(
	channel: VoiceChannel,
	options?: CreateOptions
) {
	return voiceData(channel, ChannelType.GuildVoice, options);
}

export async function fetchStageChannelData(
	channel: StageChannel,
	options?: CreateOptions
) {
	return voiceData(channel, channel.type, options);
}

export async function fetchChannelMessages(
	channel: TextChannel | NewsChannel | ThreadChannel,
	options: CreateOptions
): Promise<MessageData[]> {
	const messages: MessageData[] = [];
	const messageCount = options.maxMessagesPerChannel ?? 0;
	if (messageCount <= 0) return messages;
	let lastMessageId: Snowflake | undefined;

	while (messages.length < messageCount) {
		const fetched = await channel.messages.fetch({
			limit: 100,
			...(lastMessageId && { before: lastMessageId })
		});
		if (fetched.size === 0) break;
		lastMessageId = fetched.last()?.id;

		for (const msg of fetched.values()) {
			if (messages.length >= messageCount) break;
			if (!msg.author) continue;
			messages.push({
				username: msg.author.username,
				avatar: msg.author.displayAvatarURL(),
				content: msg.cleanContent,
				embeds: msg.embeds.map((x) => x.toJSON()),
				files: msg.attachments.map((a) => ({
					name: a.name,
					attachment: a.url
				})),
				pinned: msg.pinned,
				sentAt: msg.createdAt.toISOString()
			});
		}
	}
	return messages;
}

async function readMessages(
	channel: TextChannel | NewsChannel | ThreadChannel,
	options: CreateOptions
): Promise<MessageData[]> {
	try {
		return await fetchChannelMessages(channel, options);
	} catch (error) {
		logger.err(`Backup: messages of ${channel.id}: ${error}`);
		options.onPartial?.("messages");
		return [];
	}
}

export async function fetchTextChannelData(
	channel: TextChannel | NewsChannel,
	options: CreateOptions
): Promise<TextChannelData> {
	const forum = channel as unknown as ForumChannel;
	const data: TextChannelData = {
		type: channel.type,
		name: channel.name,
		nsfw: channel.nsfw,
		rateLimitPerUser: channel.rateLimitPerUser ?? undefined,
		parent: channel.parent ? channel.parent.name : null,
		topic: channel.topic,
		permissions: fetchChannelPermissions(channel, options),
		messages: [],
		isNews: channel.type === ChannelType.GuildAnnouncement,
		threads: [],
		defaultAutoArchiveDuration: channel.defaultAutoArchiveDuration,
		defaultThreadRateLimitPerUser:
			channel.defaultThreadRateLimitPerUser ?? undefined
	};

	const isForum =
		(channel.type as ChannelType) === ChannelType.GuildForum ||
		(channel.type as ChannelType) === ChannelType.GuildMedia;
	if (isForum) {
		data.forum = {
			// A custom emoji belongs to the old server.
			availableTags: forum.availableTags.map((tag) => ({
				name: tag.name,
				moderated: tag.moderated,
				emojiName: tag.emoji?.id ? null : (tag.emoji?.name ?? null)
			})),
			defaultSortOrder: forum.defaultSortOrder,
			defaultForumLayout: forum.defaultForumLayout,
			defaultReaction: forum.defaultReactionEmoji?.id
				? null
				: (forum.defaultReactionEmoji?.name ?? null)
		};
	}

	for (const thread of channel.threads.cache.values()) {
		const threadData: ThreadChannelData = {
			type: thread.type,
			name: thread.name,
			archived: thread.archived,
			autoArchiveDuration: thread.autoArchiveDuration,
			locked: thread.locked,
			invitable: thread.invitable,
			rateLimitPerUser: thread.rateLimitPerUser,
			messages: await readMessages(thread, options)
		};
		data.threads.push(threadData);
	}

	if (!isForum) {
		data.messages = await readMessages(channel, options);
	}
	return data;
}

export async function loadCategory(
	categoryData: CategoryData,
	guild: Guild,
	options?: LoadOptions
) {
	return guild.channels.create({
		name: categoryData.name,
		type: ChannelType.GuildCategory,
		permissionOverwrites: includes(options, "permissions")
			? await buildOverwrites(categoryData.permissions, guild)
			: undefined,
		reason: REASON
	});
}

function includes(options: LoadOptions | undefined, c: BackupComponent) {
	return !options?.components || options.components.includes(c);
}

async function replayMessages(
	webhook: Webhook,
	messages: MessageData[],
	options: LoadOptions | undefined,
	threadId?: string
) {
	const limit = options?.maxMessagesPerChannel;
	if (limit === 0) return;
	let queue = messages
		.filter(
			(m) =>
				(m.content?.length ?? 0) > 0 ||
				(m.embeds?.length ?? 0) > 0 ||
				(m.files?.length ?? 0) > 0
		)
		.reverse();
	if (limit && limit !== -1) queue = queue.slice(-limit);

	for (const msg of queue) {
		try {
			const payload: WebhookMessageCreateOptions = {
				content: msg.content?.length ? msg.content : undefined,
				username: msg.username,
				avatarURL: msg.avatar,
				embeds: msg.embeds,
				// A restore must never ping the whole server again.
				allowedMentions: options?.allowedMentions ?? { parse: [] },
				...(threadId ? { threadId } : {})
			};

			// Attachment links expire: a file may simply be gone by now.
			const files: AttachmentBuilder[] = [];
			for (const file of msg.files ?? []) {
				const response = await fetch(file.attachment as string).catch(
					() => null
				);
				if (!response?.ok) continue;
				files.push(
					new AttachmentBuilder(
						Buffer.from(await response.arrayBuffer()),
						{ name: file.name }
					)
				);
			}
			if (files.length) payload.files = files;
			if (!payload.content && !msg.embeds?.length && !files.length)
				continue;

			const sent = (await webhook.send(payload)) as Message;
			if (msg.pinned) await sent.pin().catch(() => undefined);
		} catch (error) {
			logger.err(`Backup restore: message skipped: ${error}`);
		}
	}
}

/** These types need a Community server; Discord refuses them elsewhere. */
function restorableType(
	type: TextChannelData["type"],
	guild: Guild
): TextChannelData["type"] {
	if (guild.features.includes(GuildFeature.Community)) return type;
	switch (type) {
		case ChannelType.GuildAnnouncement:
		case ChannelType.GuildForum:
		case ChannelType.GuildMedia:
			return ChannelType.GuildText;
		case ChannelType.GuildStageVoice:
			return ChannelType.GuildVoice;
		default:
			return type;
	}
}

function createOptionsFor(
	data: TextChannelData | VoiceChannelData,
	guild: Guild,
	category: CategoryChannel | null | undefined,
	permissionOverwrites: OverwriteData[] | undefined
): GuildChannelCreateOptions {
	const type = restorableType(data.type, guild);
	const base = {
		name: data.name,
		parent: category,
		permissionOverwrites,
		reason: REASON
	};
	if (
		type === ChannelType.GuildVoice ||
		type === ChannelType.GuildStageVoice
	) {
		const voice = data as VoiceChannelData;
		return {
			...base,
			type,
			bitrate: Math.min(
				voice.bitrate,
				MaxBitratePerTier[guild.premiumTier]
			),
			...(type === ChannelType.GuildVoice
				? { userLimit: voice.userLimit }
				: {}),
			rtcRegion: voice.rtcRegion ?? undefined,
			videoQualityMode: voice.videoQualityMode ?? undefined,
			nsfw: voice.nsfw,
			rateLimitPerUser: voice.rateLimitPerUser ?? undefined
		} as GuildChannelCreateOptions;
	}

	const text = data as TextChannelData;
	const isForum =
		type === ChannelType.GuildForum || type === ChannelType.GuildMedia;
	return {
		...base,
		type: type as never,
		topic: text.topic || undefined,
		nsfw: text.nsfw,
		...(type === ChannelType.GuildAnnouncement
			? {}
			: { rateLimitPerUser: text.rateLimitPerUser }),
		defaultAutoArchiveDuration: text.defaultAutoArchiveDuration,
		defaultThreadRateLimitPerUser: text.defaultThreadRateLimitPerUser,
		...(isForum && text.forum
			? {
					availableTags: text.forum.availableTags.map((tag) => ({
						name: tag.name,
						moderated: tag.moderated,
						emoji: tag.emojiName
							? { id: null, name: tag.emojiName }
							: null
					})),
					defaultSortOrder: text.forum.defaultSortOrder ?? undefined,
					defaultForumLayout:
						text.forum.defaultForumLayout ?? undefined,
					defaultReactionEmoji: text.forum.defaultReaction
						? { id: null, name: text.forum.defaultReaction }
						: undefined
				}
			: {})
	} as GuildChannelCreateOptions;
}

const COMMUNITY_CHANNEL_KEY = {
	rules: "rulesChannel",
	publicUpdates: "publicUpdatesChannel",
	safetyAlerts: "safetyAlertsChannel"
} as const;

async function restoreMessages(
	channel: TextChannel | NewsChannel,
	data: TextChannelData,
	options: LoadOptions | undefined
) {
	const withMessages = options?.maxMessagesPerChannel !== 0;
	const hasContent =
		withMessages &&
		(data.messages.length > 0 ||
			data.threads.some((t) => t.messages.length > 0));
	const webhook = hasContent
		? await channel
				.createWebhook({
					name: "MessagesBackup",
					avatar: channel.client.user.displayAvatarURL(),
					reason: REASON
				})
				.catch(() => null)
		: null;

	if (webhook) await replayMessages(webhook, data.messages, options);

	for (const threadData of data.threads) {
		// A private thread must never come back public.
		const isPrivate = threadData.type === ChannelType.PrivateThread;
		if (isPrivate && channel.type !== ChannelType.GuildText) continue;
		const thread = await channel.threads
			.create({
				name: threadData.name,
				autoArchiveDuration:
					threadData.autoArchiveDuration ?? undefined,
				...(isPrivate
					? {
							type: ChannelType.PrivateThread,
							invitable: threadData.invitable ?? undefined
						}
					: {}),
				reason: REASON
			} as never)
			.catch(() => null);
		if (!thread) continue;
		if (webhook) {
			await replayMessages(
				webhook,
				threadData.messages,
				options,
				thread.id
			);
		}
		if (threadData.locked) {
			await thread.setLocked(true, REASON).catch(() => undefined);
		}
		if (threadData.archived) {
			await thread.setArchived(true, REASON).catch(() => undefined);
		}
	}
}

async function restoreForumPosts(
	forum: ForumChannel,
	data: TextChannelData,
	options: LoadOptions | undefined
) {
	if (options?.maxMessagesPerChannel === 0) return;
	const webhook = await forum
		.createWebhook({
			name: "MessagesBackup",
			avatar: forum.client.user.displayAvatarURL(),
			reason: REASON
		})
		.catch(() => null);
	for (const post of data.threads) {
		const ordered = [...post.messages].reverse();
		const first = ordered.find((m) => m.content?.length);
		if (!first) continue;
		const thread = await forum.threads
			.create({
				name: post.name,
				autoArchiveDuration: post.autoArchiveDuration ?? undefined,
				message: {
					content: first.content,
					allowedMentions: { parse: [] }
				},
				reason: REASON
			})
			.catch(() => null);
		if (thread && webhook) {
			await replayMessages(
				webhook,
				ordered.filter((m) => m !== first).reverse(),
				options,
				thread.id
			);
		}
	}
}

export async function loadChannel(
	channelData: TextChannelData | VoiceChannelData,
	guild: Guild,
	category?: CategoryChannel | null,
	options?: LoadOptions
): Promise<void> {
	const communityRole = (channelData as TextChannelData).communityRole;
	const protectedChannel = communityRole
		? guild[COMMUNITY_CHANNEL_KEY[communityRole]]
		: null;
	const overwrites = includes(options, "permissions")
		? await buildOverwrites(channelData.permissions, guild)
		: undefined;

	let channel;
	if (protectedChannel) {
		// Discord refuses to delete it while the server is a community.
		channel = await protectedChannel.edit({
			name: channelData.name,
			parent: category ?? null,
			reason: REASON
		});
		if (overwrites) {
			await channel.permissionOverwrites.set(overwrites, REASON);
		}
	} else {
		// At creation: a failure must not leave a private channel public.
		channel = await guild.channels.create(
			createOptionsFor(channelData, guild, category, overwrites)
		);
	}

	if (
		channel.type === ChannelType.GuildText ||
		channel.type === ChannelType.GuildAnnouncement
	) {
		await restoreMessages(
			channel as TextChannel | NewsChannel,
			channelData as TextChannelData,
			options
		);
	} else if (
		channel.type === ChannelType.GuildForum ||
		channel.type === ChannelType.GuildMedia
	) {
		await restoreForumPosts(
			channel as unknown as ForumChannel,
			channelData as TextChannelData,
			options
		);
	}
}

async function deleteAll<T>(
	items: Iterable<T>,
	remove: (item: T) => Promise<unknown>
) {
	for (const item of items) {
		await remove(item).catch((e) => logger.err(String(e)));
	}
}

/**
 * Wipes only what is about to be restored. Roles are never recreated, which
 * would strip them from members: only those absent from the backup go, and
 * only when channels are rebuilt too.
 */
export async function clearGuild(
	guild: Guild,
	components: readonly BackupComponent[],
	backup: Pick<BackupData, "roles">
) {
	const has = (c: BackupComponent) => components.includes(c);

	if (has("roles") && has("channels")) {
		const candidates = [
			...guild.roles.cache
				.filter((role) => role.id !== guild.id && !role.managed)
				.sort((a, b) => a.position - b.position)
				.values()
		];
		const surplus = surplusRoleNames(
			candidates.map((role) => role.name),
			backup.roles.filter((r) => !r.isEveryone).map((r) => r.name)
		);
		for (const name of surplus) {
			const index = candidates.findIndex((role) => role.name === name);
			const [role] = candidates.splice(index, 1);
			if (role.editable) {
				await role.delete(REASON).catch((e) => logger.err(String(e)));
			}
		}
	}
	if (has("channels")) {
		await deleteAll(guild.channels.cache.values(), (channel) =>
			channel.delete(REASON)
		);
		const webhooks = await guild.fetchWebhooks().catch(() => null);
		if (webhooks) {
			await deleteAll(webhooks.values(), (w) => w.delete(REASON));
		}
	}
	if (has("emojis")) {
		await deleteAll(guild.emojis.cache.values(), (e) => e.delete(REASON));
	}
	if (has("stickers")) {
		const stickers = await guild.stickers.fetch().catch(() => null);
		if (stickers) {
			await deleteAll(stickers.values(), (s) => s.delete(REASON));
		}
	}
	if (has("automod")) {
		const rules = await guild.autoModerationRules.fetch().catch(() => null);
		if (rules) {
			await deleteAll(rules.values(), (r) => r.delete(REASON));
		}
	}
	if (has("bans")) {
		const bans = await getBans(guild).catch(() => null);
		if (bans) {
			await deleteAll(bans, (b) => guild.members.unban(b.id, REASON));
		}
	}
}
