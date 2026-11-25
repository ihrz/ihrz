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

import { beforeEach, expect, mock, test } from "bun:test";

import { readyTables } from "../readyTables.ts";

const embeds: Record<string, unknown> = {
	"EMBED.THANKS": {
		embedOwner: "1",
		embedSource: {
			title: "Boost #{boostCount}",
			description: "{memberMention} · tier {boostTier} · {guildName}"
		}
	}
};

mock.module("../../src/Events/client/ready.js", () =>
	readyTables({
		metasTable: {
			get: async (key: string) => embeds[key] ?? null,
			set: async () => undefined,
			delete: async () => undefined,
			has: async () => false,
			all: async () => [],
			push: async () => undefined,
			pull: async () => undefined
		}
	})
);

type TestClient = {
	func?: { method?: Record<string, unknown> };
	iHorizon_Emojis?: object;
	user?: { id: string };
};
const g = globalThis as { client?: TestClient };
g.client ??= { user: { id: "bot" }, func: {} };
g.client.iHorizon_Emojis ??= {};

const messages = await import("../../src/core/functions/method/messages.ts");

// The embed helper reads the global client: other files may replace it.
beforeEach(() => {
	g.client ??= { user: { id: "bot" } };
	g.client.func ??= {};
	g.client.func.method ??= {};
	g.client.func.method.generateCustomMessagePreview ??=
		messages.generateCustomMessagePreview;
});

const {
	BOOST_MESSAGE_VARS,
	MAX_RECENT_BOOST_DELAY_MS,
	applyBoostVariables,
	boostChange,
	buildBoostPayload,
	composeBoostPayload,
	planBoostMessage,
	renderBoostText
} = await import("../../src/core/modules/boostMessage.ts");

const NOW = 1_800_000_000_000;
const member = (since: number | null, partial = false) => ({
	partial,
	premiumSince: partial || since === null ? null : new Date(since),
	premiumSinceTimestamp: since
});

test("boostChange: a fresh boost is a boost", () => {
	expect(boostChange(member(null), member(NOW - 1000), NOW)).toBe("boost");
});

test("boostChange: a boost older than 10 minutes is a replayed update", () => {
	expect(
		boostChange(
			member(null),
			member(NOW - MAX_RECENT_BOOST_DELAY_MS - 1),
			NOW
		)
	).toBeNull();
	expect(
		boostChange(member(null), member(NOW - MAX_RECENT_BOOST_DELAY_MS), NOW)
	).toBe("boost");
});

test("boostChange: a boost that ends is an unboost", () => {
	expect(boostChange(member(NOW - 5e9), member(null), NOW)).toBe("unboost");
});

test("boostChange: unchanged, or a boost date that moves, is nothing", () => {
	expect(boostChange(member(null), member(null), NOW)).toBeNull();
	expect(boostChange(member(NOW - 10), member(NOW - 10), NOW)).toBeNull();
	expect(boostChange(member(NOW - 5e9), member(NOW - 10), NOW)).toBeNull();
});

test("boostChange: partial members are read through premiumSinceTimestamp", () => {
	expect(boostChange(member(null, true), member(NOW - 1000), NOW)).toBe(
		"boost"
	);
	expect(boostChange(member(NOW - 5e9, true), member(null), NOW)).toBe(
		"unboost"
	);
});

const guild = {
	name: "Gems",
	memberCount: 42,
	premiumSubscriptionCount: 7,
	premiumTier: 2
} as never;
const user = {
	username: "booster",
	createdAt: new Date(0),
	toString: () => "<@99>"
} as never;

test("the variable list names the boost and member variables", () => {
	expect(BOOST_MESSAGE_VARS).toContain("{boostCount}");
	expect(BOOST_MESSAGE_VARS).toContain("{boostTier}");
	expect(BOOST_MESSAGE_VARS).toContain("{memberMention}");
});

test("{boostCount} and {boostTier}, every occurrence, 0 when unknown", () => {
	expect(
		applyBoostVariables("{boostCount}/{boostCount} t{boostTier}", guild)
	).toBe("7/7 t2");
	expect(
		applyBoostVariables("{boostCount} {boostTier}", {
			premiumSubscriptionCount: null,
			premiumTier: 0
		} as never)
	).toBe("0 0");
});

test("renderBoostText replaces boost and member variables", () => {
	expect(
		renderBoostText(
			"{memberMention} {memberUsername} {memberCount} {guildName} {boostCount} {boostTier}",
			{ guild, user, guildLocal: "en-US" }
		)
	).toBe("<@99> booster 42 Gems 7 2");
});

test("plan: custom vs default text", () => {
	expect(planBoostMessage({ message: "hi" }, false).useDefaultText).toBe(
		false
	);
	expect(planBoostMessage({ message: "  " }, false).useDefaultText).toBe(
		true
	);
	expect(planBoostMessage({ message: null }, false).useDefaultText).toBe(
		true
	);
});

test("plan: textEnabled false drops the text only with an embed", () => {
	expect(planBoostMessage({ textEnabled: false }, true).sendText).toBe(false);
	expect(planBoostMessage({ textEnabled: false }, false).sendText).toBe(true);
	expect(planBoostMessage({}, true).sendText).toBe(true);
});

test("plan: channel and DM targets", () => {
	expect(planBoostMessage({ channelId: "5", dm: true }, false)).toMatchObject(
		{ channelId: "5", dm: true }
	);
	expect(planBoostMessage({}, false)).toMatchObject({
		channelId: null,
		dm: false
	});
});

test("payload: only the member can be mentioned, nothing empty is sent", () => {
	const payload = composeBoostPayload({
		memberId: "99",
		text: "@everyone <@&1> thanks <@99>",
		embed: null
	});
	expect(payload?.allowedMentions).toEqual({ parse: [], users: ["99"] });
	expect(
		composeBoostPayload({ memberId: "99", text: null, embed: null })
	).toBeNull();
	expect(
		composeBoostPayload({
			memberId: "99",
			text: "x".repeat(3000),
			embed: null,
			testTag: "test"
		})?.content
	).toHaveLength(2000);
});

const lang = {
	boostmsg_default_boost: "Thanks {memberMention} ({boostCount})",
	boostmsg_default_unboost: "Bye {memberUsername}"
} as never;
const guildMember = { id: "99", guild, user } as never;

test("buildBoostPayload: default text, translated, with variables", async () => {
	const { payload } = await buildBoostPayload(
		guildMember,
		"boost",
		{ enabled: true },
		lang,
		"en-US"
	);
	expect(payload?.content).toBe("Thanks <@99> (7)");
	expect(payload?.embeds).toBeUndefined();

	const unboost = await buildBoostPayload(
		guildMember,
		"unboost",
		{ enabled: true, message: "" },
		lang,
		"en-US"
	);
	expect(unboost.payload?.content).toBe("Bye booster");
});

test("buildBoostPayload: embed variables, embed only, test tag", async () => {
	const { payload } = await buildBoostPayload(
		guildMember,
		"boost",
		{ enabled: true, embedId: "THANKS", textEnabled: false },
		lang,
		"en-US",
		"-# test"
	);
	expect(payload?.content).toBe("-# test");
	expect(payload?.embeds?.[0]).toMatchObject({
		title: "Boost #7",
		description: "<@99> · tier 2 · Gems"
	});
});

test("buildBoostPayload: an unknown embed code falls back to the text", async () => {
	const { payload } = await buildBoostPayload(
		guildMember,
		"boost",
		{ enabled: true, embedId: "GONE", textEnabled: false, message: "hey" },
		lang,
		"en-US"
	);
	expect(payload?.content).toBe("hey");
	expect(payload?.embeds).toBeUndefined();
});
