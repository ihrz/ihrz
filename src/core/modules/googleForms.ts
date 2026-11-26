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

// Google Forms linked to a server (`{guildId}.GUILD.GOOGLE_FORMS`). An Apps
// Script in the form posts each response to the gateway, which checks the
// signature, stores it (table `google_forms`) and sends
// `guild.form.submitted` here: the bot posts the card and gives the role.

import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	Client,
	escapeMarkdown,
	Guild,
	GuildMember,
	MessageFlags,
	PermissionFlagsBits,
	Role,
	TextDisplayBuilder
} from "discord.js";
import { randomBytes } from "node:crypto";

import { DatabaseStructure } from "../../../types/database_structure.js";
import { GatewayLink } from "../../../types/gateway_link.js";
import { LanguageData } from "../../../types/languageData.js";
import { googleFormsTable } from "../database/tables.js";
import logger from "../logger.js";
import { ACCENT, botSignature, buildCard, cardPayload } from "./uiCard.js";

type Link = DatabaseStructure.GoogleFormLink;
type Review = DatabaseStructure.GoogleFormReview;
type Reviews = Record<string, Review>;

/** Answers shown on the card; the others are counted in "+N more". */
export const CARD_MAX_ANSWERS = 20;
/** A Components V2 message holds 4000 characters of text in all. */
const ANSWERS_BUDGET = 2800;
const QUESTION_MAX = 120;
const ANSWER_MAX = 300;
const SNOWFLAKE = /^\d{17,20}$/;

export function configKey(guildId: string): string {
	return `${guildId}.GUILD.GOOGLE_FORMS`;
}

export async function getLink(
	client: Client,
	guildId: string,
	linkId: string
): Promise<Link | null> {
	const config = (await client.db.get(
		configKey(guildId)
	)) as DatabaseStructure.GoogleFormsConfig | null;
	const links = Array.isArray(config?.links) ? config.links : [];
	return links.find((l) => l?.id === linkId) ?? null;
}

function clipText(value: string, max: number): string {
	const flat = value.trim();
	return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function answerText(answer: unknown): string {
	if (Array.isArray(answer)) return answer.map(String).join(", ");
	return answer === null || answer === undefined ? "" : String(answer);
}

/**
 * The member named by the answer to the link's member question: a user id
 * (or a mention) is fetched; anything else must match a USERNAME exactly,
 * case-insensitive (Discord's member search is a prefix search). Display
 * names and nicknames are not unique, so they never match: the role could go
 * to someone else.
 */
export async function resolveMember(
	guild: Guild,
	query: string | null | undefined
): Promise<GuildMember | null> {
	let q = (query ?? "").trim();
	if (!q) return null;
	const mention = q.match(/^<@!?(\d{17,20})>$/);
	if (mention) q = mention[1];
	if (SNOWFLAKE.test(q)) {
		return guild.members.fetch(q).catch(() => null);
	}

	q = q.replace(/^@/, "").replace(/#0$/, "").toLowerCase();
	// Usernames are 2..32 characters.
	if (q.length < 1 || q.length > 32) return null;
	const matches = (m: GuildMember) => m.user.username.toLowerCase() === q;

	const cached = guild.members.cache.find(matches);
	if (cached) return cached;
	const found = await guild.members
		.search({ query: q, limit: 10 })
		.catch(() => null);
	return found?.find(matches) ?? null;
}

/**
 * Why the bot does not give `role` to `member` (null: it can). Same guards as
 * /temprole: the role exists, is not managed nor @everyone, sits below the
 * bot's highest role, and the bot may manage roles.
 */
export function roleRefusal(
	guild: Guild,
	role: Role | null | undefined,
	member: GuildMember | null
): string | null {
	if (!member) return "member not found";
	if (!role) return "role not found";
	if (role.managed || role.id === guild.id) return "role is managed";
	const me = guild.members.me;
	if (!me?.permissions.has(PermissionFlagsBits.ManageRoles))
		return "missing Manage Roles permission";
	if (role.position >= me.roles.highest.position)
		return "role is above the bot's highest role";
	return null;
}

/** Roles of the link, 10 at most: the list, else the single role of older configs. */
function rolesOf(list: unknown, single: string | null | undefined): string[] {
	const ids = Array.isArray(list)
		? list.filter(
				(id): id is string =>
					typeof id === "string" && SNOWFLAKE.test(id)
			)
		: [];
	if (ids.length) return [...new Set(ids)].slice(0, 10);
	return single && SNOWFLAKE.test(single) ? [single] : [];
}

/** Given to the member (at once, or on acceptance in review mode). */
export function acceptRoles(link: Link): string[] {
	return rolesOf(link.roleIds, link.roleId);
}

/** Given when an application is refused. */
export function refuseRoles(link: Link): string[] {
	return rolesOf(link.refusedRoleIds, link.refusedRoleId);
}

/**
 * Gives every role the bot can give (each one checked like before: below the bot, not managed, Manage Roles),
 * one request per missing role. True when the member holds all of them afterwards; one it cannot give never stops the others.
 */
export async function giveRoles(
	guild: Guild,
	member: GuildMember,
	roleIds: string[],
	reason: string
): Promise<boolean> {
	const roles = roleIds.map((id) => guild.roles.cache.get(id));
	const givable = roles.filter(
		(r): r is Role => !!r && !roleRefusal(guild, r, member)
	);
	const missing = givable.filter((r) => !member.roles.cache.has(r.id));
	if (missing.length) {
		for (const role of missing) {
			await member.roles.add(role, reason).catch(() => null);
		}
	}
	return roleIds.every((id) => member.roles.cache.has(id));
}

export interface FormCardInput {
	name: string;
	formTitle: string;
	submittedAt: number;
	answers: GatewayLink.FormAnswer[];
	member: GuildMember | null;
	memberQuery: string | null;
	test: boolean;
	/** An application waiting for a reviewer (link in review mode). */
	pending?: boolean;
	lang: LanguageData;
	emojis?: Partial<Record<"Ticket_Form" | "Ticket_User" | "Timer", string>>;
	signature?: string | null;
}

/** The card of one response (mentions never ping: cardPayload). */
export function formCard(o: FormCardInput) {
	const { lang } = o;
	const answers = Array.isArray(o.answers) ? o.answers : [];
	const lines: string[] = [];
	let used = 0;
	let shown = 0;
	for (const a of answers) {
		if (shown >= CARD_MAX_ANSWERS) break;
		const question = escapeMarkdown(
			clipText(String(a?.question ?? ""), QUESTION_MAX)
		);
		const raw = clipText(answerText(a?.answer), ANSWER_MAX);
		const value = raw
			? escapeMarkdown(raw)
					.split("\n")
					.map((l) => `> ${l}`)
					.join("\n")
			: `> -# ${lang.gforms_no_answer}`;
		const line = `**${question || "?"}**\n${value}`;
		if (shown > 0 && used + line.length > ANSWERS_BUDGET) break;
		lines.push(line);
		used += line.length + 1;
		shown++;
	}
	const more = answers.length - shown;

	const description = [
		lang.gforms_new_response.replace(
			"${form}",
			escapeMarkdown(clipText(o.formTitle || o.name, 100))
		),
		o.test ? `-# ${lang.gforms_test_mark}` : null,
		o.pending ? `-# ⏳ ${lang.gforms_review_pending}` : null
	]
		.filter(Boolean)
		.join("\n");

	const memberValue = o.member
		? `${o.member} (\`${o.member.id}\`)`
		: o.memberQuery?.trim()
			? lang.gforms_member_not_found.replace(
					"${query}",
					escapeMarkdown(clipText(o.memberQuery, 64))
				)
			: null;

	const seconds = Math.floor((o.submittedAt || Date.now()) / 1000);
	return buildCard({
		accent: o.test ? ACCENT.warning : ACCENT.info,
		emoji: o.emojis?.Ticket_Form,
		title: clipText(o.name, 64),
		description,
		fields: [
			memberValue
				? {
						emoji: o.emojis?.Ticket_User,
						label: lang.gforms_label_member,
						value: memberValue
					}
				: null,
			{
				emoji: o.emojis?.Timer,
				label: lang.gforms_label_submitted,
				value: `<t:${seconds}:f>`
			}
		],
		blocks: [
			lines.join("\n"),
			more > 0
				? `-# ${lang.gforms_more_answers.replace("${count}", String(more))}`
				: null
		],
		signature: o.signature ?? null
	});
}

function postableChannel(guild: Guild, channelId: string | null) {
	if (!channelId) return null;
	const channel = guild.channels.cache.get(channelId);
	if (
		!channel ||
		(channel.type !== ChannelType.GuildText &&
			channel.type !== ChannelType.GuildAnnouncement)
	)
		return null;
	const me = guild.members.me;
	const allowed = me
		?.permissionsIn(channel.id)
		.has([
			PermissionFlagsBits.ViewChannel,
			PermissionFlagsBits.SendMessages
		]);
	return allowed ? channel : null;
}

const NOTHING: GatewayLink.FormSubmittedAck = {
	posted: false,
	roleGiven: false,
	memberId: null
};

/** `guild.form.submitted`: posts the card, gives the role; never throws for a refusal. */
export async function handleFormSubmitted(
	client: Client,
	event: GatewayLink.FormSubmittedEvent
): Promise<GatewayLink.FormSubmittedAck> {
	const guild = client.guilds.cache.get(event.guildId);
	if (!guild) throw "guild not found";
	const link = await getLink(client, event.guildId, event.linkId);
	if (!link || !link.enabled) return { ...NOTHING };

	const test = event.test === true;
	const member = link.memberQuestion
		? await resolveMember(guild, event.memberQuery)
		: null;
	const lang = await client.func.getLanguageData(guild.id);
	const name = link.name || event.name;

	// Applications: no role now, a reviewer decides (a test response is never reviewed).
	const reviewing = link.review === true && !test;
	const reviewId = reviewing ? randomBytes(6).toString("hex") : null;

	let posted = false;
	let messageId: string | null = null;
	const channel = postableChannel(guild, link.channelId);
	if (channel) {
		const card = formCard({
			name,
			formTitle: event.formTitle,
			submittedAt: event.submittedAt,
			answers: event.answers,
			member,
			memberQuery: link.memberQuestion ? event.memberQuery : null,
			test,
			pending: reviewing,
			lang,
			emojis: client.iHorizon_Emojis,
			signature: await botSignature(client, guild.id)
		});
		const payload = cardPayload(card) as {
			components: unknown[];
		};
		if (reviewId)
			payload.components.push(reviewButtons(link.id, reviewId, lang));
		const sent = await channel.send(payload as never).catch(() => null);
		posted = !!sent;
		messageId = sent?.id ?? null;
	}

	if (reviewId) {
		await withReviews(event.guildId, link.id, (reviews) => {
			reviews[reviewId] = {
				responseId: event.responseId ?? "",
				memberId: member?.id ?? null,
				status: "pending",
				at: event.submittedAt || Date.now(),
				channelId: posted ? link.channelId : null,
				messageId
			};
		});
	}

	let roleGiven = false;
	// A test response never gives the roles: its answers are made up. An application waits for a reviewer.
	const roles = acceptRoles(link);
	if (roles.length && member && !test && !reviewing) {
		roleGiven = await giveRoles(
			guild,
			member,
			roles,
			lang.gforms_role_reason.replace("${name}", name)
		);
	}

	return { posted, roleGiven, memberId: member?.id ?? null };
}

/** Erases the stored responses of every link of a server (the bot left it). */
export async function deleteGuildForms(
	client: Client,
	guildId: string
): Promise<void> {
	const config = (await client.db
		.get(configKey(guildId))
		.catch(() => null)) as DatabaseStructure.GoogleFormsConfig | null;
	const links = Array.isArray(config?.links) ? config.links : [];
	for (const link of links) {
		if (typeof link?.id !== "string" || !link.id) continue;
		const statsKey = `S_${guildId}_${link.id}`;
		const stats = (await googleFormsTable
			.get(statsKey)
			.catch(() => null)) as DatabaseStructure.GoogleFormStats | null;
		const pages = Array.isArray(stats?.pages) ? stats.pages : [];
		const prefix = `R_${guildId}_${link.id}_`;
		for (const page of pages) {
			// Only this link's pages, whatever the stats document says.
			if (typeof page !== "string" || !page.startsWith(prefix)) continue;
			await googleFormsTable.delete(page).catch(() => null);
		}
		await googleFormsTable
			.delete(statsKey)
			.catch((e) => logger.warn(`Google Forms cleanup: ${e}`));
		await googleFormsTable
			.delete(reviewsKey(guildId, link.id))
			.catch(() => null);
	}
}

// ------------------------------------------------------------ applications ---
// A link in review mode: each response is an application, accepted or refused by a reviewer (the card's
// buttons, gform-review.ts, or the dashboard's guild.form.review). The role is given on acceptance only.

/** Applications kept per link: the oldest decided ones go first. */
export const REVIEW_MAX = 500;
/** customId: `gform-review%{accept|refuse}%{linkId}%{reviewId}` (buttons/gform-review.ts). */
export const REVIEW_BUTTON = "gform-review";
const REASON_MAX = 1000;

export function reviewsKey(guildId: string, linkId: string): string {
	return `V_${guildId}_${linkId}`;
}

/** At most `max` applications: decided ones dropped first (oldest first), then the oldest pending. */
export function trimReviews(
	reviews: Reviews,
	max: number = REVIEW_MAX
): Reviews {
	const entries = Object.entries(reviews);
	if (entries.length <= max) return reviews;
	const order = entries.sort(([, a], [, b]) => {
		const decided =
			Number(a.status === "pending") - Number(b.status === "pending");
		return decided !== 0 ? decided : (a.at ?? 0) - (b.at ?? 0);
	});
	return Object.fromEntries(order.slice(entries.length - max));
}

// One writer at a time per link (two reviewers clicking together decide once).
const reviewLocks = new Map<string, Promise<unknown>>();
async function withReviews<T>(
	guildId: string,
	linkId: string,
	fn: (reviews: Reviews) => T | Promise<T>
): Promise<T> {
	const key = reviewsKey(guildId, linkId);
	const previous = reviewLocks.get(key) ?? Promise.resolve();
	const run = previous.then(async () => {
		const stored = await googleFormsTable.get(key).catch(() => null);
		const reviews: Reviews =
			stored && typeof stored === "object" && !Array.isArray(stored)
				? { ...(stored as Reviews) }
				: {};
		const result = await fn(reviews);
		await googleFormsTable.set(key, trimReviews(reviews));
		return result;
	});
	reviewLocks.set(
		key,
		run.catch(() => undefined)
	);
	return run;
}

/** The server's owner, administrators, and the link's reviewer role. */
export function isReviewer(member: GuildMember, link: Link): boolean {
	if (member.id === member.guild.ownerId) return true;
	if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
	return !!link.reviewerRoleId && member.roles.cache.has(link.reviewerRoleId);
}

export function reviewButtons(
	linkId: string,
	reviewId: string,
	lang: LanguageData
) {
	return new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId(`${REVIEW_BUTTON}%accept%${linkId}%${reviewId}`)
			.setStyle(ButtonStyle.Success)
			.setEmoji("✅")
			.setLabel(lang.gforms_review_accept),
		new ButtonBuilder()
			.setCustomId(`${REVIEW_BUTTON}%refuse%${linkId}%${reviewId}`)
			.setStyle(ButtonStyle.Danger)
			.setEmoji("❌")
			.setLabel(lang.gforms_review_refuse)
	);
}

/** The decision line that replaces the buttons on the card. */
export function reviewStatusText(review: Review, lang: LanguageData): string {
	const when = `<t:${Math.floor((review.decidedAt ?? Date.now()) / 1000)}:R>`;
	const who = review.decidedBy ? `<@${review.decidedBy}>` : "?";
	const line = (
		review.status === "accepted"
			? lang.gforms_review_accepted
			: lang.gforms_review_refused
	)
		.replace("${user}", who)
		.replace("${time}", when);
	return review.reason
		? `${line}\n> ${lang.gforms_review_reason.replace("${reason}", escapeMarkdown(review.reason))}`
		: line;
}

export interface DecideInput {
	guild: Guild;
	link: Link;
	/** The card's buttons know the review; the dashboard knows the response. */
	reviewId?: string;
	responseId?: string;
	actor: GuildMember;
	decision: "accept" | "refuse";
	reason?: string | null;
}

/**
 * Accepts or refuses an application: the role of the decision (accept: roleId, refuse: refusedRoleId), the
 * private message to the applicant (unless the link turns it off), and the card's buttons replaced by the
 * decision. Throws "forbidden: …", "application not found" or "already decided" (the ack's error).
 */
export async function decideReview(
	client: Client,
	o: DecideInput
): Promise<GatewayLink.FormReviewAck> {
	const { guild, link, actor, decision } = o;
	if (!isReviewer(actor, link))
		throw "forbidden: not a reviewer of this form";
	const lang = await client.func.getLanguageData(guild.id);
	const reason =
		decision === "refuse" && o.reason?.trim()
			? o.reason.trim().slice(0, REASON_MAX)
			: null;

	const decided = await withReviews(guild.id, link.id, (reviews) => {
		const id =
			o.reviewId && reviews[o.reviewId]
				? o.reviewId
				: Object.keys(reviews).find(
						(k) =>
							!!o.responseId &&
							reviews[k]?.responseId === o.responseId
					);
		const review = id ? reviews[id] : undefined;
		if (!id || !review) throw "application not found";
		if (review.status !== "pending") throw "already decided";
		review.status = decision === "accept" ? "accepted" : "refused";
		review.decidedBy = actor.id;
		review.decidedByName = actor.displayName || actor.user.username;
		review.decidedAt = Date.now();
		review.reason = reason;
		return { ...review };
	});

	const member = decided.memberId
		? await guild.members.fetch(decided.memberId).catch(() => null)
		: null;
	const roles = decision === "accept" ? acceptRoles(link) : refuseRoles(link);
	let roleGiven = false;
	if (roles.length && member) {
		roleGiven = await giveRoles(
			guild,
			member,
			roles,
			lang.gforms_role_reason.replace("${name}", link.name)
		);
	}

	let dmSent = false;
	if (member && link.notifyApplicant !== false) {
		const text = (
			decision === "accept"
				? lang.gforms_review_dm_accepted
				: lang.gforms_review_dm_refused
		)
			.replace("${name}", escapeMarkdown(link.name))
			.replace("${guild}", escapeMarkdown(guild.name));
		const card = buildCard({
			accent: decision === "accept" ? ACCENT.success : ACCENT.danger,
			title: lang.gforms_review_dm_title,
			description: reason
				? `${text}\n> ${lang.gforms_review_reason.replace("${reason}", escapeMarkdown(reason))}`
				: text,
			signature: await botSignature(client, guild.id)
		});
		dmSent = await member
			.send(cardPayload(card) as never)
			.then(() => true)
			.catch(() => false);
	}

	// The card: its buttons replaced by the decision.
	if (decided.channelId && decided.messageId) {
		const channel = guild.channels.cache.get(decided.channelId);
		const message =
			channel && channel.isTextBased()
				? await channel.messages
						.fetch(decided.messageId)
						.catch(() => null)
				: null;
		const first = message?.components?.[0];
		if (message && first) {
			await message
				.edit({
					components: [
						first.toJSON(),
						new TextDisplayBuilder().setContent(
							reviewStatusText(decided, lang)
						)
					],
					flags: [MessageFlags.IsComponentsV2],
					allowedMentions: { parse: [] }
				} as never)
				.catch(() => null);
		}
	}

	return {
		status: decided.status as "accepted" | "refused",
		roleGiven,
		dmSent
	};
}

/** `guild.form.review`: a decision taken in the dashboard (the actor must be a reviewer). */
export async function handleFormReview(
	client: Client,
	event: GatewayLink.FormReviewEvent
): Promise<GatewayLink.FormReviewAck> {
	const guild = client.guilds.cache.get(event.guildId);
	if (!guild) throw "guild not found";
	const link = await getLink(client, event.guildId, event.linkId);
	if (!link) throw "form not found";
	if (link.review !== true) throw "this form does not review applications";
	const actor = await guild.members.fetch(event.actorId).catch(() => null);
	if (!actor) throw "forbidden: not a member of the server";
	return decideReview(client, {
		guild,
		link,
		responseId: event.responseId,
		actor,
		decision: event.decision === "refuse" ? "refuse" : "accept",
		reason: event.reason ?? null
	});
}
