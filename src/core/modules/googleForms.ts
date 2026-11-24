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
	ChannelType,
	Client,
	escapeMarkdown,
	Guild,
	GuildMember,
	PermissionFlagsBits,
	Role
} from "discord.js";

import { DatabaseStructure } from "../../../types/database_structure.js";
import { GatewayLink } from "../../../types/gateway_link.js";
import { LanguageData } from "../../../types/languageData.js";
import { googleFormsTable } from "../database/tables.js";
import logger from "../logger.js";
import { ACCENT, botSignature, buildCard, cardPayload } from "./uiCard.js";

type Link = DatabaseStructure.GoogleFormLink;

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

export interface FormCardInput {
	name: string;
	formTitle: string;
	submittedAt: number;
	answers: GatewayLink.FormAnswer[];
	member: GuildMember | null;
	memberQuery: string | null;
	test: boolean;
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
		o.test ? `-# ${lang.gforms_test_mark}` : null
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

	let posted = false;
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
			lang,
			emojis: client.iHorizon_Emojis,
			signature: await botSignature(client, guild.id)
		});
		posted = await channel
			.send(cardPayload(card) as never)
			.then(() => true)
			.catch(() => false);
	}

	let roleGiven = false;
	// A test response never gives the role: its answers are made up.
	if (link.roleId && member && !test) {
		const role = guild.roles.cache.get(link.roleId);
		const refusal = roleRefusal(guild, role, member);
		if (!refusal && role) {
			roleGiven =
				member.roles.cache.has(role.id) ||
				(await member.roles
					.add(role, lang.gforms_role_reason.replace("${name}", name))
					.then(() => true)
					.catch(() => false));
		}
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
	}
}
