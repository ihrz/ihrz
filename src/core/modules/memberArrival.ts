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
 * Member arrival: the gates (blacklists, bot blocker, too-new accounts, name
 * filter, captcha) decide first, the "welcome side" (join roles, role saver,
 * welcome message and card, join DM, ghost pings) runs after.
 *
 * - Every arrival waits `GATE_GRACE_MS`, then for the gates still checking
 *   (`holdArrival`, capped at `HOLD_CAP_MS`).
 * - A gate that turns the member away calls `markRejected` BEFORE the ban /
 *   kick: no welcome side, and no leave message for that membership.
 * - Captcha on for this member: the welcome side waits for `captchaPassed`
 *   (failure, timeout or leaving: it never runs). What was resolved on join
 *   (the credited invite) is kept with it, in memory, `ARRIVAL_TTL_MS`.
 *
 * Invite tracking is NOT part of the welcome side: credited on join.
 */

import { Client, GuildMember } from "discord.js";

import logger from "../logger.js";

/** How long the captcha waits for an answer (2 min 30 s). */
export const CAPTCHA_TIMEOUT_MS = 60_000 * 2 + 30_000;

/** Time given to the gates before anything welcomes the member. */
export const GATE_GRACE_MS = 1_500;

/** Longest wait for a gate still checking (bot blocker reads the audit log). */
export const HOLD_CAP_MS = 10_000;

/** A pending arrival (captcha) is forgotten after this. */
export const ARRIVAL_TTL_MS = CAPTCHA_TIMEOUT_MS + 60_000;

/** A rejection is remembered this long (its leave event comes right after). */
export const REJECTED_TTL_MS = 10 * 60_000;

/** Who the welcome message credits, resolved once, on join. */
export interface WelcomeContext {
	invite?: {
		code: string;
		inviterId: string;
		inviterUsername: string | null;
	} | null;
	/** Joined through the server's discord.gg vanity link (uses went up). */
	vanity?: { code: string; uses: number } | null;
	/**
	 * Set when the welcome side runs after the captcha: the role the captcha
	 * removes (`/security role-to-remove`, the "Pending" role). The join roles
	 * and the role saver don't give it back.
	 */
	captchaRemovedRole?: string | null;
}

export type WelcomeStep = (
	client: Client,
	member: GuildMember,
	ctx: WelcomeContext
) => Promise<unknown>;

/** Steps of the welcome side; roles first, so pings reach a member who can see. */
export interface WelcomeSteps {
	roles: WelcomeStep[];
	messages: WelcomeStep[];
}

type ArrivalState = "waiting" | "captcha" | "passed" | "running" | "done";

interface Arrival {
	joined: number | null;
	state: ArrivalState;
	holds: Set<Promise<void>>;
	ctx: WelcomeContext | null;
	/** `/security role-to-remove`, noted when the captcha is passed. */
	removedRole: string | null;
	/** A coordinator already handles it (Discord sometimes repeats the event). */
	settling: boolean;
	/** The coordinator stored the context and waits for the captcha. */
	parked: boolean;
	left: boolean;
	expires: number;
	client: Client | null;
}

const timings = {
	graceMs: GATE_GRACE_MS,
	holdCapMs: HOLD_CAP_MS
};

/** Tests only: shorter waits. */
export function setArrivalTimings(next: Partial<typeof timings>): void {
	Object.assign(timings, next);
}

const arrivals = new Map<string, Arrival>();
const rejected = new Map<string, { joined: number | null; expires: number }>();
let steps: WelcomeSteps = { roles: [], messages: [] };

/** Registered once by the join event (the steps live in the event files). */
export function setWelcomeSteps(next: WelcomeSteps): void {
	steps = next;
}

const keyOf = (member: GuildMember) => `${member.guild.id}:${member.id}`;
const joinedOf = (member: GuildMember) => member.joinedTimestamp ?? null;

/** Same membership, unless one side doesn't know its join time. */
function sameMembership(a: number | null, b: number | null): boolean {
	return a === null || b === null || a === b;
}

function sweep(now = Date.now()): void {
	for (const [key, entry] of arrivals)
		if (entry.expires <= now) arrivals.delete(key);
	for (const [key, entry] of rejected)
		if (entry.expires <= now) rejected.delete(key);
}

function arrivalOf(member: GuildMember): Arrival | null {
	const entry = arrivals.get(keyOf(member));
	if (!entry || entry.expires <= Date.now()) return null;
	if (!sameMembership(entry.joined, joinedOf(member))) return null;
	return entry;
}

/** Starts tracking an arrival. Called synchronously on `guildMemberAdd`. */
export function beginArrival(member: GuildMember): void {
	sweep();
	const key = keyOf(member);
	const existing = arrivals.get(key);
	// Several listeners (or a duplicated event) may begin the same membership.
	if (existing && existing.joined === joinedOf(member)) return;
	arrivals.set(key, {
		joined: joinedOf(member),
		state: "waiting",
		holds: new Set(),
		ctx: null,
		removedRole: null,
		settling: false,
		parked: false,
		left: false,
		expires: Date.now() + ARRIVAL_TTL_MS,
		client: null
	});
}

/**
 * A gate is still checking this member: the welcome side waits for the
 * returned release (or `HOLD_CAP_MS`). Call it before the gate's first await.
 */
export function holdArrival(member: GuildMember): () => void {
	beginArrival(member);
	const entry = arrivals.get(keyOf(member))!;
	let release!: () => void;
	const promise = new Promise<void>((resolve) => {
		release = resolve;
	});
	entry.holds.add(promise);
	return () => {
		entry.holds.delete(promise);
		release();
	};
}

/** A gate turned this member away. Call it before the ban / kick. */
export function markRejected(member: GuildMember): void {
	rejected.set(keyOf(member), {
		joined: joinedOf(member),
		expires: Date.now() + REJECTED_TTL_MS
	});
	const entry = arrivalOf(member);
	if (entry) entry.ctx = null;
}

export function isRejected(member: GuildMember): boolean {
	const entry = rejected.get(keyOf(member));
	if (!entry || entry.expires <= Date.now()) return false;
	return sameMembership(entry.joined, joinedOf(member));
}

/** The captcha is posted for this member: the welcome side waits for it. */
export function markCaptchaPending(member: GuildMember): void {
	beginArrival(member);
	const entry = arrivals.get(keyOf(member))!;
	if (entry.state === "waiting") entry.state = "captcha";
}

/** The captcha could not be posted after all: welcome as if it were off. */
export function clearCaptchaPending(member: GuildMember): void {
	const entry = arrivalOf(member);
	if (entry?.state === "captcha") entry.state = "waiting";
}

/** The member solved the captcha: run the welcome side kept for them. */
export async function captchaPassed(
	member: GuildMember,
	removedRole: string | null = null
): Promise<void> {
	const entry = arrivalOf(member);
	if (!entry || entry.state !== "captcha") return;
	entry.state = "passed";
	entry.removedRole = removedRole;
	// The coordinator has not parked yet: it will see "passed" and run.
	if (!entry.parked || !entry.client || !entry.ctx) return;
	await runParked(entry, member);
}

async function runParked(entry: Arrival, member: GuildMember): Promise<void> {
	if (entry.left || isRejected(member)) return;
	entry.state = "running";
	try {
		await runWelcomeSide(entry.client!, member, {
			...entry.ctx!,
			captchaRemovedRole: entry.removedRole
		});
	} finally {
		entry.state = "done";
		arrivals.delete(keyOf(member));
	}
}

/**
 * Leave event: true when a leave message may be posted. False for a member a
 * gate turned away, or one who never got their welcome (left during the
 * captcha or the grace): they were never announced.
 */
export function noteDeparture(member: GuildMember): boolean {
	const rejectedNow = isRejected(member);
	const entry = arrivalOf(member);
	if (!entry) return !rejectedNow;
	// Kept until its TTL: every leave listener gets the same answer.
	entry.left = true;
	const welcomed = entry.state === "running" || entry.state === "done";
	return welcomed && !rejectedNow;
}

/** Join roles, role saver, then welcome message, join DM and ghost pings. */
export async function runWelcomeSide(
	client: Client,
	member: GuildMember,
	ctx: WelcomeContext
): Promise<void> {
	// One failing step never stops the others, but it is logged (it used to
	// vanish: a welcome that never came left no trace).
	const run = (step: WelcomeStep) =>
		step(client, member, ctx).catch((error) => {
			logger.err(
				`[arrival] ${step.name || "welcome step"} failed in ${member.guild.id}: ${String(error)}`
			);
			return null;
		});
	await Promise.all(steps.roles.map(run));
	await Promise.all(steps.messages.map(run));
}

const sleep = (ms: number) =>
	new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Called by the join event once the invite is resolved: waits for the gates,
 * then runs the welcome side now, or keeps it for the captcha.
 * Resolves to what happened (for tests and logs).
 */
export async function settleArrival(
	client: Client,
	member: GuildMember,
	ctx: WelcomeContext,
	startedAt = Date.now()
): Promise<"welcomed" | "rejected" | "captcha" | "left" | "duplicate"> {
	beginArrival(member);
	const entry = arrivalOf(member);
	if (!entry) return "left";
	if (entry.settling) return "duplicate";
	entry.settling = true;

	const graceLeft = startedAt + timings.graceMs - Date.now();
	if (graceLeft > 0) await sleep(graceLeft);
	if (entry.holds.size > 0)
		await Promise.race([
			Promise.all([...entry.holds]),
			sleep(timings.holdCapMs)
		]);

	if (isRejected(member)) return "rejected";
	if (entry.left) return "left";

	entry.ctx = ctx;
	entry.client = client;
	if (entry.state === "captcha") {
		entry.parked = true;
		return "captcha";
	}
	if (entry.state === "passed") {
		await runParked(entry, member);
		return "welcomed";
	}
	if (entry.state !== "waiting") return "welcomed";

	entry.state = "running";
	try {
		await runWelcomeSide(client, member, ctx);
	} finally {
		entry.state = "done";
		// Kept until the TTL: a leave right after still sees "welcomed".
	}
	return "welcomed";
}

/** Tests only. */
export function resetArrivals(): void {
	arrivals.clear();
	rejected.clear();
}
