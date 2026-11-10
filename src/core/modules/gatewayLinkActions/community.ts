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

// Dashboard actions of the community features: giveaways, suggestions,
// starboard / skullboard, polls and /say. Each one does the work of a slash
// command through the same shared functions, with the same guards and logs.

import {
	BaseGuildTextChannel,
	ChannelType,
	Client,
	Guild,
	GuildMember,
	PermissionFlagsBits,
	PermissionResolvable
} from "discord.js";

import { DatabaseStructure } from "../../../../types/database_structure.js";
import { Giveaway } from "../../../../types/giveaways.js";
import {
	addPollVotes,
	buildPollCard,
	isFunDisabled,
	sayPayload
} from "../communityMessages.js";
import {
	checkGiveawayOptions,
	getGuildGiveaway,
	GiveawayEndedStatus,
	GiveawayOptionError,
	startGiveaway
} from "../giveawaysManager.js";
import {
	canManageSuggestions,
	deleteSuggestion,
	SuggestionOutcome,
	suggestionRows,
	updateSuggestion
} from "../suggestionManager.js";
import { cardPayload } from "../uiCard.js";
import { ActionContext, ActionGroup, fail, Params } from "./types.js";

// Giveaways listed by `giveaways.list` (active first, then the ended ones the
// bot still keeps).
export const MAX_GIVEAWAYS_LISTED = 100;
export const ENTRIES_PAGE = 100;
export const MAX_SUGGESTIONS_PAGE = 100;
export const MAX_BOARD_PAGE = 50;
// Board messages fetched at once, and how long one may take.
const BOARD_FETCH_CONCURRENCY = 5;
const BOARD_FETCH_TIMEOUT_MS = 4_000;
// Discord's message limit (what /say posts must fit).
const MESSAGE_MAX = 2000;

export const SUGGESTION_STATUSES = [
	"pending",
	"reviewing",
	"accepted",
	"planned",
	"implemented",
	"denied"
] as const satisfies readonly DatabaseStructure.SuggestionStatus[];

const REQUIREMENTS = ["none", "invites", "messages", "roles"] as const;

const messageUrl = (guildId: string, channelId: string, messageId: string) =>
	`https://discord.com/channels/${guildId}/${channelId}/${messageId}`;

// `ihorizon_logs` only reads `.guild`: same log channel as the commands.
function logs(
	{ client, guild }: ActionContext,
	embed: { title: string; description: string }
): Promise<void> {
	return client.func.ihorizon_logs({ guild }, embed);
}

// A text channel of this guild where the actor may write (the bot posts in
// their name) and the bot can post.
export async function postableChannel(
	guild: Guild,
	actor: GuildMember,
	channelId: string,
	botNeeds: PermissionResolvable[] = []
): Promise<BaseGuildTextChannel> {
	const channel =
		guild.channels.cache.get(channelId) ??
		(await guild.channels.fetch(channelId).catch(() => null));
	if (!channel) return fail("channel not found");
	if (
		channel.type !== ChannelType.GuildText &&
		channel.type !== ChannelType.GuildAnnouncement
	) {
		return fail("this channel can't receive messages");
	}
	const send = [
		PermissionFlagsBits.ViewChannel,
		PermissionFlagsBits.SendMessages
	];
	if (!channel.permissionsFor(actor)?.has(send)) {
		return fail("forbidden: you can't send messages in this channel");
	}
	const me = guild.members.me;
	if (!me || !channel.permissionsFor(me)?.has([...send, ...botNeeds])) {
		return fail("the bot is missing permissions in this channel");
	}
	return channel as BaseGuildTextChannel;
}

// --- Giveaways ---------------------------------------------------------------

export interface GiveawaySummary {
	id: string;
	channelId: string;
	prize: string;
	winnerCount: number;
	winners: string[];
	hostedBy: string;
	endsAt: number;
	ended: boolean;
	entries: number;
	requirement: { type: string; value: string | null };
	imageUrl: string | null;
	url: string;
}

// `winners` is "None" (string) when nobody won.
export function winnersOf(giveaway: Pick<Giveaway, "winners">): string[] {
	return Array.isArray(giveaway.winners) ? giveaway.winners : [];
}

export function summarizeGiveaway(id: string, g: Giveaway): GiveawaySummary {
	return {
		id,
		channelId: g.channelId,
		prize: g.prize,
		winnerCount: g.winnerCount,
		winners: winnersOf(g),
		hostedBy: g.hostedBy,
		endsAt: new Date(g.expireIn).getTime(),
		ended: g.ended === GiveawayEndedStatus.ENDED,
		entries: new Set(g.entries ?? []).size,
		requirement: {
			type: g.requirement?.type ?? "none",
			value: g.requirement?.value ?? null
		},
		imageUrl: g.embedImageURL ?? null,
		url: messageUrl(g.guildId, g.channelId, id)
	};
}

// Active giveaways first (ending soonest first), then the ended ones (most
// recent first).
export function sortGiveaways(list: GiveawaySummary[]): GiveawaySummary[] {
	return [...list].sort((a, b) => {
		if (a.ended !== b.ended) return a.ended ? 1 : -1;
		return a.ended ? b.endsAt - a.endsAt : a.endsAt - b.endsAt;
	});
}

const GIVEAWAY_ERRORS: Record<GiveawayOptionError, string> = {
	winners: "the number of winners must be at least 1",
	duration: "invalid duration",
	invites: "the invites requirement must be a number",
	messages: "the messages requirement must be a number",
	roles: "requirement role not found"
};

async function guildGiveaway(
	{ client, guild }: ActionContext,
	id: string
): Promise<Giveaway> {
	return (
		(await getGuildGiveaway(client, guild.id, id)) ??
		fail("giveaway not found")
	);
}

interface EntryProfile {
	id: string;
	username: string | null;
	displayName: string | null;
	avatarUrl: string | null;
}

async function entryProfiles(
	client: Client,
	guild: Guild,
	ids: string[]
): Promise<EntryProfile[]> {
	const missing = ids.filter((id) => !guild.members.cache.has(id));
	if (missing.length > 0) {
		await guild.members
			.fetch({ user: missing, time: 5_000 })
			.catch(() => null);
	}
	return ids.map((id) => {
		const member = guild.members.cache.get(id);
		const user = member?.user ?? client.users.cache.get(id);
		return {
			id,
			username: user?.username ?? null,
			displayName: member?.displayName ?? user?.globalName ?? null,
			avatarUrl: (member ?? user)?.displayAvatarURL({ size: 64 }) ?? null
		};
	});
}

// --- Suggestions -------------------------------------------------------------

const SUGGESTION_CODE = /^#?([A-Za-z0-9]{1,32})$/;

// Codes are `generatePassword({ length: 12 })` (letters): never a DB path.
export function suggestionCode(params: Params): string {
	const match = SUGGESTION_CODE.exec(params.str("id", { max: 33 }));
	return match ? match[1] : fail("invalid parameter: id");
}

// What every `/suggest` staff subcommand checks first (the channel check of
// the command has no meaning here: the system must just be on).
async function suggestionStaff({
	client,
	guild,
	actor
}: ActionContext): Promise<DatabaseStructure.SuggestSchema> {
	const config = (await client.db.get(
		`${guild.id}.SUGGEST`
	)) as DatabaseStructure.SuggestSchema | null;
	if (!canManageSuggestions(actor, config)) {
		return fail("forbidden: only the suggestion staff can do this");
	}
	if (!config?.channel || config.disable === true) {
		return fail("the suggestion system is disabled on this server");
	}
	return config;
}

export function suggestionOutcomeError(outcome: SuggestionOutcome): void {
	if (outcome === "not_found") fail("suggestion not found");
	if (outcome === "already")
		fail("this suggestion is closed or already has this status");
	if (outcome === "missing") fail("suggestion message not found");
}

async function changeSuggestion(
	ctx: ActionContext,
	update: {
		status?: DatabaseStructure.SuggestionStatus;
		reason: string | null;
	}
) {
	const code = suggestionCode(ctx.params);
	await suggestionStaff(ctx);
	const result = await updateSuggestion(
		ctx.client,
		ctx.guild,
		code,
		{ ...update, moderator: ctx.actor.user },
		ctx.lang
	);
	suggestionOutcomeError(result.outcome);
	return { id: code, messageId: result.messageId ?? null };
}

// --- Starboard / skullboard ----------------------------------------------------

export interface BoardEntry {
	messageId: string;
	channelId: string;
	authorId: string;
	url: string;
	boardMessageId: string;
	boardUrl: string | null;
	count: number | null;
	content: string | null;
	authorName: string | null;
	authorAvatarUrl: string | null;
	imageUrl: string | null;
}

// The board message is `⭐ **12** | <#channel>`: the count lives only there.
export function boardCount(content: string | null | undefined): number | null {
	const match = /\*\*(\d+)\*\*/.exec(content ?? "");
	return match ? Number(match[1]) : null;
}

async function mapLimit<T, R>(
	items: T[],
	limit: number,
	fn: (item: T) => Promise<R>
): Promise<R[]> {
	const out: R[] = new Array(items.length);
	let next = 0;
	const worker = async () => {
		while (next < items.length) {
			const i = next++;
			out[i] = await fn(items[i]);
		}
	};
	await Promise.all(
		Array.from({ length: Math.min(limit, items.length) }, worker)
	);
	return out;
}

const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T | null> =>
	Promise.race([
		p.catch(() => null),
		new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))
	]);

async function listBoard(
	{ client, guild, params }: ActionContext,
	dbKey: "STARBOARD" | "SKULLBOARD"
) {
	const page = params.int("page", { min: 0, def: 0 });
	const limit = params.int("limit", {
		min: 1,
		max: MAX_BOARD_PAGE,
		def: 25
	});
	const config = (await client.db.get(
		`${guild.id}.GUILD.${dbKey}`
	)) as DatabaseStructure.StarboardConfigSchema | null;
	const data = ((await client.db.get(`${guild.id}.GUILD.${dbKey}_DATA`)) ??
		[]) as DatabaseStructure.StarboardDataSchema;

	// Newest first (the bot appends).
	const all = Array.isArray(data) ? [...data].reverse() : [];
	const slice = all.slice(page * limit, page * limit + limit);
	const boardChannel = config?.channel
		? (guild.channels.cache.get(config.channel) as
				BaseGuildTextChannel | undefined)
		: undefined;

	const entries = await mapLimit(
		slice,
		BOARD_FETCH_CONCURRENCY,
		async (entry): Promise<BoardEntry> => {
			const board = boardChannel?.messages?.fetch
				? await withTimeout(
						boardChannel.messages.fetch(entry.number),
						BOARD_FETCH_TIMEOUT_MS
					)
				: null;
			const embed = board?.embeds?.[0];
			return {
				messageId: entry.messageId,
				channelId: entry.channelId,
				authorId: entry.author,
				url: messageUrl(guild.id, entry.channelId, entry.messageId),
				boardMessageId: entry.number,
				boardUrl: config?.channel
					? messageUrl(guild.id, config.channel, entry.number)
					: null,
				count: boardCount(board?.content),
				content: embed?.description?.slice(0, 300) ?? null,
				authorName: embed?.author?.name ?? null,
				authorAvatarUrl: embed?.author?.iconURL ?? null,
				imageUrl: embed?.image?.url ?? null
			};
		}
	);

	return {
		enabled: !!config && config.enabled !== "no" && !!config.channel,
		channelId: config?.channel ?? null,
		threshold: Math.max(2, config?.threshold || 2),
		total: all.length,
		page,
		pages: Math.ceil(all.length / limit),
		entries
	};
}

// --- Actions -------------------------------------------------------------------

export const communityActions: ActionGroup = {
	"giveaways.list": {
		read: true,
		command: "gw get-all",
		run: async ({ client, guild }) => {
			const all = await client.giveawaysManager.getAllGiveawayData();
			const mine = all
				.filter(
					({ giveawayData }) => giveawayData?.guildId === guild.id
				)
				.map(({ giveawayId, giveawayData }) =>
					summarizeGiveaway(giveawayId, giveawayData)
				);
			return {
				total: mine.length,
				giveaways: sortGiveaways(mine).slice(0, MAX_GIVEAWAYS_LISTED)
			};
		}
	},

	"giveaways.entries": {
		read: true,
		command: "gw list-entries",
		run: async (ctx) => {
			const id = ctx.params.id("id");
			const page = ctx.params.int("page", { min: 0, def: 0 });
			const giveaway = await guildGiveaway(ctx, id);
			const ids = [...new Set(giveaway.entries ?? [])];
			const slice = ids.slice(
				page * ENTRIES_PAGE,
				(page + 1) * ENTRIES_PAGE
			);
			return {
				id,
				total: ids.length,
				page,
				pages: Math.ceil(ids.length / ENTRIES_PAGE),
				entries: await entryProfiles(ctx.client, ctx.guild, slice)
			};
		}
	},

	"giveaways.create": {
		command: "gw create",
		run: async (ctx) => {
			const { client, guild, actor, params, lang } = ctx;
			const channel = await postableChannel(
				guild,
				actor,
				params.id("channelId"),
				[
					PermissionFlagsBits.EmbedLinks,
					PermissionFlagsBits.AttachFiles
				]
			);
			const winnerCount = params.int("winners");
			const durationMs = client.timeCalculator.to_ms(
				params.str("time", { max: 64 })
			);
			const requirement = {
				type: params.oneOf("requirement", REQUIREMENTS, "none"),
				value: params.optStr("requirementValue", 100)
			};
			const prize = params.str("prize", { max: 256 });
			const imageUrl = params.optStr("image", 2000);

			const error = checkGiveawayOptions(client, guild, {
				winnerCount,
				durationMs,
				requirement
			});
			if (error) fail(GIVEAWAY_ERRORS[error]);
			if (durationMs <= 0) fail(GIVEAWAY_ERRORS.duration);

			const message = await startGiveaway(client, channel, {
				winnerCount,
				durationMs,
				prize,
				hostedBy: actor.id,
				imageUrl,
				requirement
			}).catch(() => null);
			if (!message) fail("the bot couldn't post in this channel");

			await logs(ctx, {
				title: lang.start_logs_embed_title,
				description: lang.start_logs_embed_description
					.replace("${authorId}", actor.id)
					.replaceAll("${giveawayChannel}", channel.toString())
			});

			return {
				id: message!.id,
				channelId: channel.id,
				url: messageUrl(guild.id, channel.id, message!.id),
				endsAt: Date.now() + durationMs
			};
		}
	},

	// /gw end does not wait for the draw; here it is awaited (a few seconds).
	"giveaways.end": {
		command: "gw end",
		run: async (ctx) => {
			const { client, actor, params, lang } = ctx;
			const id = params.id("id");
			await guildGiveaway(ctx, id);
			if (await client.giveawaysManager.isEnded(id)) {
				fail("this giveaway has already ended");
			}
			const ok = await client.giveawaysManager.end(client, id).then(
				() => true,
				() => false
			);
			if (!ok) fail("this giveaway can't be ended");

			await logs(ctx, {
				title: lang.end_logs_embed_title,
				description: lang.end_logs_embed_description
					.replaceAll("${authorId}", actor.id)
					.replaceAll("${messageId}", id)
			});

			const after = await getGuildGiveaway(client, ctx.guild.id, id);
			return { id, ended: true, winners: after ? winnersOf(after) : [] };
		}
	},

	"giveaways.reroll": {
		command: "gw reroll",
		run: async (ctx) => {
			const { client, actor, params, lang } = ctx;
			const id = params.id("id");
			await guildGiveaway(ctx, id);
			if (!(await client.giveawaysManager.isEnded(id))) {
				fail("this giveaway is not over yet");
			}
			const ok = await client.giveawaysManager.reroll(client, id).then(
				() => true,
				() => false
			);
			if (!ok) fail("this giveaway can't be rerolled");

			await logs(ctx, {
				title: lang.reroll_logs_embed_title,
				description: lang.reroll_logs_embed_description
					.replaceAll("${authorId}", actor.id)
					.replaceAll("${messageId}", id)
			});

			const after = await getGuildGiveaway(client, ctx.guild.id, id);
			return { id, winners: after ? winnersOf(after) : [] };
		}
	},

	"suggestions.list": {
		read: true,
		command: "suggest list",
		run: async ({ client, guild, actor, params }) => {
			const status = params.has("status")
				? params.oneOf("status", SUGGESTION_STATUSES)
				: null;
			const sort = params.oneOf("sort", ["recent", "score"], "recent");
			const page = params.int("page", { min: 0, def: 0 });
			const limit = params.int("limit", {
				min: 1,
				max: MAX_SUGGESTIONS_PAGE,
				def: 25
			});

			const config = (await client.db.get(
				`${guild.id}.SUGGEST`
			)) as DatabaseStructure.SuggestSchema | null;
			const all = (await client.db.get(
				`${guild.id}.SUGGESTION`
			)) as DatabaseStructure.SuggestionData | null;

			const rows = suggestionRows(all, status);
			if (sort === "recent") {
				rows.sort(
					(a, b) => (b.data.timestamp ?? 0) - (a.data.timestamp ?? 0)
				);
			}
			const channelId = config?.channel ?? null;

			return {
				enabled: !!channelId && config?.disable !== true,
				channelId,
				canManage: canManageSuggestions(actor, config),
				total: rows.length,
				page,
				pages: Math.ceil(rows.length / limit),
				suggestions: rows
					.slice(page * limit, (page + 1) * limit)
					.map(({ code, data, up, down }) => ({
						id: code,
						status: data.status ?? "pending",
						authorId: data.author,
						up,
						down,
						messageId: data.msgId,
						threadId: data.threadId ?? null,
						createdAt: data.timestamp ?? null,
						url: channelId
							? messageUrl(guild.id, channelId, data.msgId)
							: null
					}))
			};
		}
	},

	"suggestions.accept": {
		command: "suggest accept",
		run: (ctx) =>
			changeSuggestion(ctx, {
				status: "accepted",
				reason: ctx.params.str("reason", { max: 1024 })
			})
	},

	"suggestions.deny": {
		command: "suggest deny",
		run: (ctx) =>
			changeSuggestion(ctx, {
				status: "denied",
				reason: ctx.params.str("reason", { max: 1024 })
			})
	},

	"suggestions.reply": {
		command: "suggest reply",
		run: (ctx) =>
			changeSuggestion(ctx, {
				reason: ctx.params.str("message", { max: 1024 })
			})
	},

	"suggestions.status": {
		command: "suggest status",
		run: (ctx) =>
			changeSuggestion(ctx, {
				status: ctx.params.oneOf("status", SUGGESTION_STATUSES),
				reason: ctx.params.optStr("reason", 1024)
			})
	},

	"suggestions.delete": {
		command: "suggest delete",
		run: async (ctx) => {
			const code = suggestionCode(ctx.params);
			const config = await suggestionStaff(ctx);
			const result = await deleteSuggestion(
				ctx.client,
				ctx.guild,
				config.channel,
				code
			);
			suggestionOutcomeError(result);
			return { id: code, deleted: true };
		}
	},

	"starboard.list": {
		read: true,
		command: "starboard config",
		run: (ctx) => listBoard(ctx, "STARBOARD")
	},

	"skullboard.list": {
		read: true,
		command: "skullboard config",
		run: (ctx) => listBoard(ctx, "SKULLBOARD")
	},

	"polls.create": {
		command: "fun interaction poll",
		run: async ({ client, guild, actor, params, lang }) => {
			if (await isFunDisabled(client, guild.id)) {
				fail("fun commands are disabled on this server");
			}
			const question = params.str("question", { max: 2000 });
			const channel = await postableChannel(
				guild,
				actor,
				params.id("channelId"),
				[
					PermissionFlagsBits.AddReactions,
					PermissionFlagsBits.ReadMessageHistory
				]
			);
			const card = await buildPollCard(
				client,
				lang,
				guild.id,
				actor.user,
				question
			);
			const message = await client.func.method
				.channelSend(channel, cardPayload(card) as never)
				.catch(() => null);
			if (!message) fail("the bot couldn't post in this channel");
			await addPollVotes(client, message!).catch(() => {});
			return {
				messageId: message!.id,
				channelId: channel.id,
				url: messageUrl(guild.id, channel.id, message!.id)
			};
		}
	},

	"messages.say": {
		command: "say",
		run: async ({ client, guild, actor, params, lang }) => {
			const payload = sayPayload(
				lang,
				params.str("content", { max: MESSAGE_MAX }),
				actor.user
			);
			if (payload.content.length > MESSAGE_MAX) {
				fail("message too long");
			}
			const channel = await postableChannel(
				guild,
				actor,
				params.id("channelId")
			);
			const message = await client.func.method
				.channelSend(channel, payload)
				.catch(() => null);
			if (!message) fail("the bot couldn't post in this channel");
			return {
				messageId: message!.id,
				channelId: channel.id,
				url: messageUrl(guild.id, channel.id, message!.id)
			};
		}
	}
};
