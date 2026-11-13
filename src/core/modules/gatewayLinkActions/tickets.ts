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
	Guild,
	GuildMember,
	Message,
	OverwriteType,
	PermissionFlagsBits,
	PermissionOverwrites,
	TextChannel
} from "discord.js";
import { DatabaseStructure } from "../../../../types/database_structure.js";
import {
	addTicketMember,
	canManageTicket,
	closeTicketChannel,
	deleteTicketChannel,
	findTicketByChannel,
	listTicketEntries,
	remindTicketOwner,
	removeTicketMember,
	renameTicketChannel,
	reopenTicketChannel
} from "../ticketsManager.js";
import { ActionContext, ActionGroup, fail } from "./types.js";

export interface TicketMember {
	id: string;
	name: string | null;
	avatar: string | null;
}

export interface TicketSummary {
	channelId: string;
	name: string;
	createdAt: number;
	author: TicketMember;
	categoryId: string | null;
	categoryName: string | null;
	// The author was locked out by /ticket close (no "closed" state is stored).
	closed: boolean;
	// Members given access to the ticket (author and bot excluded).
	members: TicketMember[];
}

export interface TranscriptMessage {
	id: string;
	author: TicketMember & { bot: boolean };
	content: string;
	createdAt: number;
	editedAt: number | null;
	attachments: {
		name: string;
		url: string;
		size: number;
		contentType: string | null;
		width: number | null;
		height: number | null;
		spoiler: boolean;
	}[];
	embeds: {
		title: string | null;
		description: string | null;
		color: number | null;
	}[];
	// Names of the members mentioned (`<@id>`): the dashboard shows names,
	// roles and channels come from the server's own lists.
	mentions: Record<string, string>;
	// The message this one replies to (null: not a reply). `author` and
	// `content` are null when Discord did not send it along (deleted).
	reply: { id: string; author: string | null; content: string | null } | null;
	stickers: { name: string; url: string }[];
}

const REPLY_EXCERPT = 200;

const LIST_MAX = 100;
const TRANSCRIPT_MAX = 100;

// Snowflakes compare as numbers: newest first.
export const compareSnowflakeDesc = (a: string, b: string): number => {
	const x = BigInt(a);
	const y = BigInt(b);
	return x === y ? 0 : x > y ? -1 : 1;
};

export function memberSummary(guild: Guild, id: string): TicketMember {
	const member = guild.members.cache.get(id);
	const user = member?.user ?? guild.client.users.cache.get(id);
	return {
		id,
		name: member?.displayName ?? user?.username ?? null,
		avatar: (member ?? user)?.displayAvatarURL({ size: 64 }) ?? null
	};
}

// Read from the channel overwrites: who /ticket add-member let in, and
// whether /ticket close locked the author out.
export function ticketAccess(
	overwrites: Iterable<PermissionOverwrites>,
	authorId: string,
	botId: string
): { closed: boolean; members: string[] } {
	let closed = false;
	const members: string[] = [];
	for (const o of overwrites) {
		if (o.type !== OverwriteType.Member) continue;
		if (o.id === authorId) {
			closed = o.deny.has(PermissionFlagsBits.ViewChannel);
		} else if (
			o.id !== botId &&
			o.allow.has(PermissionFlagsBits.ViewChannel)
		) {
			members.push(o.id);
		}
	}
	return { closed, members };
}

export function canSee(member: GuildMember, channelId: string): boolean {
	return member.permissionsIn(channelId).has(PermissionFlagsBits.ViewChannel);
}

async function refuseIfDisabled({ client, guild }: ActionContext) {
	if (await client.db.get(`${guild.id}.GUILD.TICKET.disable`)) {
		fail("the ticket module is disabled on this server");
	}
}

// A ticket the actor can see, as every /ticket subcommand runs inside it.
async function resolveTicket(ctx: ActionContext): Promise<{
	channel: TextChannel;
	key: string;
	ticket: DatabaseStructure.TicketChannelData;
}> {
	await refuseIfDisabled(ctx);
	const channelId = ctx.params.id("channelId");
	const channel = ctx.guild.channels.cache.get(channelId);
	const found =
		channel?.type === ChannelType.GuildText
			? await findTicketByChannel(ctx.client, ctx.guild.id, channelId)
			: null;
	if (!channel || !found) return fail("ticket not found");
	if (!canSee(ctx.actor, channelId)) {
		return fail("forbidden: you cannot see this ticket");
	}
	return {
		channel: channel as TextChannel,
		key: found.key,
		ticket: found.data
	};
}

// /ticket delete, transcript and open: the author, administrators or
// whoever can manage the ticket channel.
function requireTicketStaff(
	ctx: ActionContext,
	channel: BaseGuildTextChannel,
	authorId: string
) {
	if (!canManageTicket(ctx.actor, channel.id, authorId)) {
		fail(
			"forbidden: only the ticket author or staff who can manage the channel can do this"
		);
	}
}

async function targetUser(ctx: ActionContext) {
	const userId = ctx.params.id("userId");
	const user = await ctx.client.users.fetch(userId).catch(() => null);
	if (!user) return fail("user not found");
	return user;
}

// The replied message: discord.js keeps the one Discord sends along with a
// reply (`referenced_message`) in the channel's cache, no extra fetch.
function replyOf(m: Message): TranscriptMessage["reply"] {
	const id = m.reference?.messageId;
	if (!id || m.reference?.channelId !== m.channelId) return null;
	const ref = m.channel.messages.cache.get(id);
	return {
		id,
		author: ref
			? (ref.member?.displayName ??
				ref.author.globalName ??
				ref.author.username)
			: null,
		content: ref ? ref.content.slice(0, REPLY_EXCERPT) : null
	};
}

export function toTranscriptMessage(m: Message): TranscriptMessage {
	return {
		id: m.id,
		author: {
			id: m.author.id,
			name: m.member?.displayName ?? m.author.username,
			avatar: m.author.displayAvatarURL({ size: 64 }),
			bot: m.author.bot
		},
		content: m.content,
		createdAt: m.createdTimestamp,
		editedAt: m.editedTimestamp,
		attachments: [...m.attachments.values()].map((a) => ({
			name: a.name,
			url: a.url,
			size: a.size,
			contentType: a.contentType,
			width: a.width ?? null,
			height: a.height ?? null,
			spoiler: a.spoiler
		})),
		embeds: m.embeds.map((e) => ({
			title: e.title,
			description: e.description,
			color: e.color ?? null
		})),
		mentions: Object.fromEntries(
			[...m.mentions.users.values()].map((u) => [
				u.id,
				m.mentions.members?.get(u.id)?.displayName ??
					u.globalName ??
					u.username
			])
		),
		reply: replyOf(m),
		stickers: [...m.stickers.values()].map((st) => ({
			name: st.name,
			url: st.url
		}))
	};
}

export const ticketsActions: ActionGroup = {
	// Open tickets the actor can see in Discord, newest first. Closed
	// tickets stay listed (the channel stays until /ticket delete): no
	// history of deleted tickets is kept.
	"tickets.list": {
		read: true,
		command: "ticket transcript",
		run: async ({ client, guild, actor, params }) => {
			const limit = params.int("limit", {
				min: 1,
				max: LIST_MAX,
				def: 50
			});
			const before = params.optId("before");
			const disabled = !!(await client.db.get(
				`${guild.id}.GUILD.TICKET.disable`
			));

			const visible = (await listTicketEntries(client, guild.id))
				.filter(({ data }) => {
					const channel = guild.channels.cache.get(data.channel);
					return (
						channel?.type === ChannelType.GuildText &&
						canSee(actor, channel.id)
					);
				})
				.filter(
					({ data }) =>
						!before ||
						compareSnowflakeDesc(data.channel, before) > 0
				)
				.sort((a, b) =>
					compareSnowflakeDesc(a.data.channel, b.data.channel)
				);

			const page = visible.slice(0, limit);
			const tickets: TicketSummary[] = page.map(({ data }) => {
				const channel = guild.channels.cache.get(
					data.channel
				) as TextChannel;
				const access = ticketAccess(
					channel.permissionOverwrites.cache.values(),
					data.author,
					client.user!.id
				);
				return {
					channelId: channel.id,
					name: channel.name,
					createdAt: channel.createdTimestamp,
					author: memberSummary(guild, data.author),
					categoryId: channel.parentId,
					categoryName: channel.parent?.name ?? null,
					closed: access.closed,
					members: access.members.map((id) =>
						memberSummary(guild, id)
					)
				};
			});

			return {
				disabled,
				tickets,
				nextCursor:
					visible.length > limit
						? page[page.length - 1].data.channel
						: null
			};
		}
	},

	// Structured messages instead of the HTML file of /ticket transcript,
	// newest first, `before` = message id of the next page.
	"tickets.transcript": {
		read: true,
		command: "ticket transcript",
		run: async (ctx) => {
			const { channel, ticket } = await resolveTicket(ctx);
			requireTicketStaff(ctx, channel, ticket.author);
			// The history is what Discord would let the actor scroll through.
			if (
				!ctx.actor
					.permissionsIn(channel)
					.has(PermissionFlagsBits.ReadMessageHistory)
			) {
				fail("forbidden: you cannot read this ticket's history");
			}
			const limit = ctx.params.int("limit", {
				min: 1,
				max: TRANSCRIPT_MAX,
				def: 50
			});
			const before = ctx.params.optId("before");
			const messages = await channel.messages
				.fetch(before ? { limit, before } : { limit })
				.catch(() => null);
			if (!messages) return fail("could not read the ticket messages");
			const list = [...messages.values()].sort((a, b) =>
				compareSnowflakeDesc(a.id, b.id)
			);
			return {
				channelId: channel.id,
				messages: list.map(toTranscriptMessage),
				nextCursor:
					list.length === limit ? list[list.length - 1].id : null
			};
		}
	},

	"tickets.close": {
		command: "ticket close",
		run: async (ctx) => {
			const { channel, ticket } = await resolveTicket(ctx);
			const ok = await closeTicketChannel(
				channel,
				ticket.author,
				ctx.actor.user,
				ctx.lang,
				// /ticket close answers in the ticket channel.
				(payload) => channel.send(payload)
			);
			if (!ok) return fail("could not close the ticket");
			return { closed: true };
		}
	},

	"tickets.reopen": {
		command: "ticket open",
		run: async (ctx) => {
			const { channel, ticket } = await resolveTicket(ctx);
			requireTicketStaff(ctx, channel, ticket.author);
			await reopenTicketChannel(
				channel,
				ticket.author,
				ctx.actor.user,
				ctx.lang
			).catch(() => fail("could not reopen the ticket"));
			return { reopened: true };
		}
	},

	"tickets.delete": {
		command: "ticket delete",
		run: async (ctx) => {
			const { channel, key, ticket } = await resolveTicket(ctx);
			requireTicketStaff(ctx, channel, ticket.author);
			const deleted = await deleteTicketChannel(
				channel,
				key,
				ticket.author,
				ctx.actor.user,
				ctx.lang
			);
			if (!deleted) return fail("could not delete the ticket channel");
			return { deleted: true };
		}
	},

	"tickets.rename": {
		command: "ticket rename",
		run: async (ctx) => {
			const { channel } = await resolveTicket(ctx);
			const name = ctx.params.str("name", { max: 100 }).trim();
			if (!name) return fail("missing parameter: name");
			if (!(await renameTicketChannel(channel, name))) {
				return fail("could not rename the ticket channel");
			}
			return { name: channel.name };
		}
	},

	"tickets.add-member": {
		command: "ticket add-member",
		run: async (ctx) => {
			const { channel } = await resolveTicket(ctx);
			const user = await targetUser(ctx);
			if (!(await ctx.guild.members.fetch(user.id).catch(() => null))) {
				return fail("member not found");
			}
			await addTicketMember(
				channel,
				user,
				ctx.actor.user,
				ctx.lang
			).catch(() => fail("could not add the member to the ticket"));
			return { added: user.id };
		}
	},

	"tickets.remove-member": {
		command: "ticket remove-member",
		run: async (ctx) => {
			const { channel } = await resolveTicket(ctx);
			const user = await targetUser(ctx);
			// The bot would lock itself out of the ticket.
			if (user.id === ctx.client.user?.id) {
				return fail("cannot remove the bot from a ticket");
			}
			await removeTicketMember(
				channel,
				user,
				ctx.actor.user,
				ctx.lang
			).catch(() => fail("could not remove the member from the ticket"));
			return { removed: user.id };
		}
	},

	"tickets.remind": {
		command: "ticket remind",
		run: async (ctx) => {
			const { channel, ticket } = await resolveTicket(ctx);
			const result = await remindTicketOwner(
				channel,
				ticket.author,
				ctx.lang
			);
			if (!result) return fail("could not read the ticket messages");
			if (!result.owner) return fail("ticket author not found");
			return { sent: result.sent };
		}
	}
};
