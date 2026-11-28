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
	AnyThreadChannel,
	BaseGuildTextChannel,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	ContainerBuilder,
	Guild,
	GuildMember,
	InteractionEditReplyOptions,
	MessageFlags,
	PermissionFlagsBits,
	SeparatorBuilder,
	SnowflakeUtil,
	TextDisplayBuilder,
	TextChannel,
	ThreadAutoArchiveDuration
} from "discord.js";
import { DatabaseStructure } from "../../../types/database_structure.js";
import { LanguageData } from "../../../types/languageData.js";

/** A ticket is a text channel or, opened from a thread panel, a private thread. */
export type TicketChannel = BaseGuildTextChannel | AnyThreadChannel;

/** A new thread gets at most this many staff members (one API call each). */
export const MAX_THREAD_STAFF = 50;

/** What the bot needs on the threads' channel to open and run a ticket thread. */
const THREAD_BOT_PERMISSIONS = [
	"ViewChannel",
	"SendMessages",
	"CreatePrivateThreads",
	"SendMessagesInThreads",
	"ManageThreads",
	"EmbedLinks"
] as const satisfies readonly (keyof typeof PermissionFlagsBits)[];

/** The channel a thread ticket opens in: the option's, else the panel's, else the panel message's. */
export function threadParentId(
	panel: { threadChannel?: string | null },
	option: { threadChannelId?: string } | undefined,
	panelChannelId: string
): string {
	return option?.threadChannelId || panel.threadChannel || panelChannelId;
}

/** Permission names the bot lacks on `parent` to run thread tickets ([] = none). */
export function missingThreadPermissions(parent: TextChannel): string[] {
	const me = parent.guild.members.me;
	const have = me ? parent.permissionsFor(me) : null;
	return THREAD_BOT_PERMISSIONS.filter(
		(name) => !have?.has(PermissionFlagsBits[name])
	);
}

/**
 * The staff of a thread ticket, as for a channel ticket in a category: the roles
 * that can manage threads on `parent` (granted by the channel or its category,
 * administrators included, as they see every ticket channel; not @everyone nor a bot's own role), plus
 * the roles to ping.
 */
export function staffRoleIds(
	parent: TextChannel,
	pingRoles: readonly string[]
): string[] {
	const guild = parent.guild;
	const managers = guild.roles.cache
		.filter(
			(role) =>
				role.id !== guild.id &&
				!role.managed &&
				parent
					.permissionsFor(role, false)
					.has(PermissionFlagsBits.ManageThreads)
		)
		.map((role) => role.id);
	return [...new Set([...managers, ...pingRoles])];
}

const MEMBER_FETCH_EVERY = 10 * 60_000;
const lastMemberFetch = new Map<string, number>();

/** Role members come from the cache: filled when incomplete, at most once every 10 minutes per server. */
async function fillMemberCache(guild: Guild): Promise<void> {
	const now = Date.now();
	if (
		guild.members.cache.size < guild.memberCount &&
		now - (lastMemberFetch.get(guild.id) ?? 0) > MEMBER_FETCH_EVERY
	) {
		lastMemberFetch.set(guild.id, now);
		await guild.members.fetch().catch((err: unknown) => logger.warn(err));
	}
}

/** The human members of `roleIds` (at most `MAX_THREAD_STAFF`), `exclude` left out. */
export async function staffMembers(
	guild: Guild,
	roleIds: readonly string[],
	exclude: ReadonlySet<string>
): Promise<string[]> {
	if (roleIds.length === 0) return [];
	await fillMemberCache(guild);
	const ids = new Set<string>();
	for (const roleId of roleIds) {
		const role = guild.roles.cache.get(roleId);
		if (!role) continue;
		for (const member of role.members.values()) {
			if (member.user.bot || exclude.has(member.id)) continue;
			ids.add(member.id);
			if (ids.size >= MAX_THREAD_STAFF) return [...ids];
		}
	}
	return [...ids];
}

/**
 * Opens a private thread in `parent` with the author in it; the staff are added
 * in the background (one request each: the ticket does not wait for them).
 */
/**
 * What `/ticket panel` warns about, for threads opened in `parent`: how many
 * staff members would be added, and how many members can manage threads there
 * (by the channel or its category; administrators included).
 */
export async function threadStaffCheck(
	parent: TextChannel,
	pingRoles: readonly string[]
): Promise<{ staff: number; managers: number; managerRoles: string[] }> {
	const managerRoles = staffRoleIds(parent, []);
	const staff = (
		await staffMembers(
			parent.guild,
			staffRoleIds(parent, pingRoles),
			new Set()
		)
	).length;
	await fillMemberCache(parent.guild);
	const managers = parent.guild.members.cache.filter(
		(member) =>
			!member.user.bot &&
			!!parent
				.permissionsFor(member, false)
				?.has(PermissionFlagsBits.ManageThreads)
	).size;
	return { staff, managers, managerRoles };
}

export async function createTicketThread(
	parent: TextChannel,
	name: string,
	authorId: string,
	staffIds: readonly string[]
): Promise<AnyThreadChannel> {
	const thread = await parent.threads.create({
		name: name.slice(0, 100),
		type: ChannelType.PrivateThread,
		invitable: false,
		autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
		reason: "iHorizon ticket"
	});
	try {
		await thread.members.add(authorId);
	} catch (err) {
		// No author, no ticket: the thread is not left behind.
		await thread.delete().catch(() => {});
		throw err;
	}
	void (async () => {
		for (const id of staffIds) {
			await thread.members
				.add(id)
				.catch((err: unknown) =>
					logger.warn(
						`ticket thread ${thread.id}: could not add staff member ${id}: ${String(err)}`
					)
				);
		}
	})();
	return thread;
}

/** Members cannot be added to or removed from an archived thread: it is woken up first. */
async function awake(thread: AnyThreadChannel): Promise<void> {
	if (thread.archived) await thread.setArchived(false);
}

export async function addThreadMember(
	thread: AnyThreadChannel,
	userId: string
): Promise<void> {
	await awake(thread);
	await thread.members.add(userId);
}

/** Removes `userId` from the thread; one who already left it is not an error. */
export async function removeThreadMember(
	thread: AnyThreadChannel,
	userId: string
): Promise<void> {
	await awake(thread);
	const member = await thread.members
		.fetch({ member: userId })
		.catch(() => null);
	if (member) await thread.members.remove(userId);
}

/** Closing a thread ticket, first step: locked (only staff can reopen it), still open for the closing messages. */
export async function lockThread(thread: AnyThreadChannel): Promise<void> {
	await thread.edit({ locked: true, archived: false });
}

/** Closing a thread ticket, last step, once its messages are sent. */
export async function archiveThread(thread: AnyThreadChannel): Promise<void> {
	await thread.setArchived(true);
}

export async function reopenThread(thread: AnyThreadChannel): Promise<void> {
	await thread.edit({ archived: false, locked: false });
}

/**
 * Staff of a thread ticket, never touched by the author's member menu: whoever
 * manages threads there, or holds one of the ticket's staff roles.
 */
export function isThreadStaff(
	thread: AnyThreadChannel,
	memberId: string,
	staffRoles: readonly string[]
): boolean {
	const member = thread.guild.members.cache.get(memberId);
	if (!member) return false;
	if (thread.permissionsFor(member)?.has(PermissionFlagsBits.ManageThreads))
		return true;
	return staffRoles.some((id) => member.roles.cache.has(id));
}

/**
 * A ticket's channel or thread. A thread ticket is fetched when it is not in
 * the cache (an archived thread is not); a channel ticket is not (a deleted
 * channel would cost a request for nothing).
 */
export async function fetchTicketChannel(
	guild: Guild,
	channelId: string,
	isThread: boolean,
	/** Called when Discord says the thread no longer exists (Unknown Channel). */
	onGone?: () => Promise<unknown>
): Promise<TicketChannel | null> {
	const channel =
		guild.channels.cache.get(channelId) ??
		(isThread
			? await guild.channels.fetch(channelId).catch(async (err) => {
					if ((err as { code?: unknown })?.code === 10003)
						await onGone?.();
					return null;
				})
			: null);
	if (
		channel?.type === ChannelType.GuildText ||
		channel?.type === ChannelType.PrivateThread
	)
		return channel as TicketChannel;
	return null;
}

/**
 * A private thread is seen by its members and whoever manages threads there
 * (administrators included), not by everyone who sees its channel.
 */
export async function canSeeThread(
	member: GuildMember,
	thread: AnyThreadChannel
): Promise<boolean> {
	if (thread.permissionsFor(member)?.has(PermissionFlagsBits.ManageThreads))
		return true;
	return !!(await thread.members
		.fetch({ member: member.id })
		.catch(() => null));
}

// ---- Threads' channel hub: a message with a button, the summary is ephemeral ----

const HUB_BUTTON = "ticket-thread-summary";
/** At most this many tickets in a summary (one request each for its members). */
export const SUMMARY_MAX = 15;
const hubLocks = new Map<string, Promise<void>>();

const hubKey = (guildId: string, channelId: string) =>
	`${guildId}.GUILD.TICKET_THREAD_HUB.${channelId}`;

/**
 * Posts, once, the hub of a threads' channel that is not the panel's: the
 * tickets are private threads there, so the channel shows a button that gives
 * each member, privately, the tickets they can see. A deleted hub is posted
 * again by the next call.
 */
export async function ensureThreadHub(
	parent: BaseGuildTextChannel,
	lang: LanguageData
): Promise<void> {
	const key = hubKey(parent.guildId, parent.id);
	const running = hubLocks.get(key);
	if (running) return running;
	const job = (async () => {
		const db = parent.client.db;
		const stored = (await db.get(key)) as string | null;
		if (stored && (await parent.messages.fetch(stored).catch(() => null)))
			return;
		const message = await parent.send({
			components: [
				buildHub(
					lang,
					(
						parent.client.iHorizon_Emojis as unknown as Record<
							string,
							string | undefined
						>
					).Ticket_Main
				)
			],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { parse: [] }
		});
		await db.set(key, message.id);
	})()
		.catch((err: unknown) =>
			logger.warn(`ticket thread hub in ${parent.id}: ${String(err)}`)
		)
		.finally(() => hubLocks.delete(key));
	hubLocks.set(key, job);
	return job;
}

function buildHub(
	lang: LanguageData,
	emoji: string | undefined
): ContainerBuilder {
	const button = new ButtonBuilder()
		.setCustomId(HUB_BUTTON)
		.setLabel(lang.ticket_thread_hub_button)
		.setStyle(ButtonStyle.Primary);
	if (emoji) button.setEmoji(emoji);
	return new ContainerBuilder()
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				`### ${lang.ticket_thread_hub_title}\n${lang.ticket_thread_hub_desc}`
			)
		)
		.addActionRowComponents(
			new ActionRowBuilder<ButtonBuilder>().addComponents(button)
		);
}

/** A thread's last activity (its last message, else its creation), in ms. */
function lastActivity(thread: AnyThreadChannel): number {
	return thread.lastMessageId
		? SnowflakeUtil.timestampFrom(thread.lastMessageId)
		: (thread.createdTimestamp ?? 0);
}

/**
 * The ephemeral summary of the thread tickets of `channel` that `member` can
 * see: open first, then the most recently active, `SUMMARY_MAX` at most.
 */
export async function threadTicketSummary(
	member: GuildMember,
	channel: BaseGuildTextChannel,
	lang: LanguageData
): Promise<InteractionEditReplyOptions> {
	const guild = channel.guild;
	const all = ((await guild.client.db.get(`${guild.id}.TICKET_ALL`)) ??
		{}) as DatabaseStructure.TicketData;
	const visible: {
		thread: AnyThreadChannel;
		data: DatabaseStructure.TicketChannelData;
	}[] = [];
	for (const tickets of Object.values(all)) {
		for (const data of Object.values(tickets ?? {})) {
			if (data?.type !== "thread") continue;
			const thread = await fetchTicketChannel(guild, data.channel, true);
			if (!thread?.isThread() || thread.parentId !== channel.id) continue;
			if (await canSeeThread(member, thread))
				visible.push({ thread, data });
		}
	}
	visible.sort(
		(a, b) =>
			Number(a.thread.locked === true) -
				Number(b.thread.locked === true) ||
			lastActivity(b.thread) - lastActivity(a.thread)
	);

	const container = new ContainerBuilder().addTextDisplayComponents(
		new TextDisplayBuilder().setContent(
			`### ${lang.ticket_thread_summary_title
				.replace("${channel}", channel.toString())
				.replace("${count}", String(visible.length))}`
		)
	);
	if (visible.length === 0) {
		container.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				lang.ticket_thread_summary_empty
			)
		);
	}
	for (const { thread, data } of visible.slice(0, SUMMARY_MAX)) {
		const members = await thread.members.fetch().catch(() => null);
		const others = [...(members?.keys() ?? [])].filter(
			(id) => id !== guild.client.user.id && id !== data.author
		);
		const shown = others.slice(0, 8).map((id) => `<@${id}>`);
		if (others.length > shown.length)
			shown.push(`+${others.length - shown.length}`);
		container.addSeparatorComponents(new SeparatorBuilder());
		container.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				`**${thread.toString()}** · ${thread.locked ? lang.ticket_thread_summary_closed : lang.ticket_thread_summary_open}\n` +
					lang.ticket_thread_summary_line
						.replace("${author}", `<@${data.author}>`)
						.replace(
							"${messages}",
							String(thread.messageCount ?? 0)
						)
						.replace(
							"${last}",
							`<t:${Math.floor(lastActivity(thread) / 1000)}:R>`
						) +
					`\n-# ${lang.ticket_thread_summary_members.replace("${members}", shown.length > 0 ? shown.join(" ") : lang.var_none)}`
			)
		);
	}
	if (visible.length > SUMMARY_MAX) {
		container.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				`-# ${lang.ticket_thread_summary_more.replace("${count}", String(visible.length - SUMMARY_MAX))}`
			)
		);
	}
	return {
		components: [container],
		flags: MessageFlags.IsComponentsV2,
		allowedMentions: { parse: [] }
	};
}
