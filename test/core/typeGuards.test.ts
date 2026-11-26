import { describe, expect, test } from "bun:test";
import { ChannelType, ComponentType } from "discord.js";

import {
	errorMessage,
	hasErrorName,
	isChannelOfType,
	isComponentBuilder,
	isDate,
	isDiscordApiError,
	isError,
	isGuildMember,
	isGuildTextChannel,
	isMap,
	isRole
} from "../../src/core/functions/typeGuards.js";
import {
	authorOf,
	isInteraction,
	isMessage,
	isSlash
} from "../../src/core/functions/method/source.js";

// Plain objects with the right shape: exactly what instanceof refused (a test double, a second discord.js copy).
const user = { id: "1", username: "alice", bot: false };
const slash = { user, isRepliable: () => true, isChatInputCommand: () => true };
const button = {
	user,
	isRepliable: () => true,
	isChatInputCommand: () => false
};
const message = { author: user, type: 0, content: "+ping" };
const textChannel = {
	id: "2",
	type: ChannelType.GuildText,
	isTextBased: () => true
};

describe("hybrid sources", () => {
	test("slash, other interactions and messages are told apart by shape", () => {
		expect(isSlash(slash as never)).toBe(true);
		expect(isSlash(button as never)).toBe(false);
		expect(isSlash(message as never)).toBe(false);
		expect(isInteraction(button as never)).toBe(true);
		expect(isMessage(message as never)).toBe(true);
		expect(isMessage(slash as never)).toBe(false);
	});
	test("the author is the interaction's user or the message's author", () => {
		expect(authorOf(slash as never)).toBe(user as never);
		expect(authorOf(message as never)).toBe(user as never);
	});
});

describe("shape checks", () => {
	test("errors, by name too", () => {
		const e = new Error("boom");
		expect(isError(e)).toBe(true);
		expect(isError({ message: "x", name: "Error" })).toBe(true);
		expect(isError("boom")).toBe(false);
		expect(errorMessage(e)).toBe("boom");
		expect(errorMessage(42)).toBe("42");
		const lib = Object.assign(new Error("full"), { name: "LibraryError" });
		expect(hasErrorName(lib, "LibraryError")).toBe(true);
		expect(hasErrorName(e, "LibraryError")).toBe(false);
		expect(
			isDiscordApiError(
				Object.assign(new Error("x"), {
					rawError: {},
					status: 404,
					code: 10008
				})
			)
		).toBe(true);
		expect(isDiscordApiError(e)).toBe(false);
	});
	test("dates and maps", () => {
		expect(isDate(new Date())).toBe(true);
		expect(isDate("2026-11-26")).toBe(false);
		expect(isMap(new Map())).toBe(true);
		expect(isMap({ get() {} })).toBe(false);
	});
	test("a channel is never mistaken for a message (message type 0 = GuildText 0)", () => {
		expect(isGuildTextChannel(textChannel)).toBe(true);
		expect(isGuildTextChannel(message)).toBe(false);
		expect(
			isChannelOfType(
				{ type: ChannelType.GuildVoice, isTextBased: () => true },
				ChannelType.GuildVoice
			)
		).toBe(true);
		expect(
			isGuildTextChannel({
				type: ChannelType.GuildVoice,
				isTextBased: () => true
			})
		).toBe(false);
	});
	test("members, roles and builders", () => {
		const guild = { id: "g" };
		const member = { user, guild, roles: {}, joinedTimestamp: 1 };
		const role = { guild, position: 3, hoist: false, permissions: {} };
		expect(isGuildMember(member)).toBe(true);
		expect(isGuildMember(role)).toBe(false);
		expect(isRole(role)).toBe(true);
		expect(isRole(member)).toBe(false);
		const btn = {
			data: { type: ComponentType.Button },
			toJSON: () => ({})
		};
		expect(isComponentBuilder(btn, ComponentType.Button)).toBe(true);
		expect(isComponentBuilder(btn, ComponentType.Section)).toBe(false);
	});
});
