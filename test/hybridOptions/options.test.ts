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

import { describe, expect, test } from "bun:test";
import {
	ChatInputCommandInteraction,
	Collection,
	type Message
} from "discord.js";

// method.ts imports the database layer; stub the global client it reads.
(globalThis as any).client = (globalThis as any).client ?? {
	user: { id: "bot" },
	func: {}
};

const { options } = await import("../../src/core/functions/method.js");

function slashInteraction(calls: Record<string, unknown>) {
	const seen: Array<[string, unknown[]]> = [];
	const handler =
		(kind: string) =>
		(...a: unknown[]) => {
			seen.push([kind, a]);
			return calls[kind];
		};
	const fake = Object.create(ChatInputCommandInteraction.prototype);
	fake.options = {
		getString: handler("getString"),
		getNumber: handler("getNumber"),
		getInteger: handler("getInteger"),
		getMember: handler("getMember"),
		getUser: handler("getUser"),
		getChannel: handler("getChannel"),
		getRole: handler("getRole"),
		getAttachment: handler("getAttachment")
	};
	return { fake: fake as ChatInputCommandInteraction, seen };
}

function prefixMessage(extra: Record<string, unknown> = {}) {
	const members = new Collection<string, any>();
	const fake = {};
	Object.assign(fake, {
		content: "",
		mentions: {
			parsedUsers: new Collection(),
			channels: new Collection(),
			roles: new Collection()
		},
		guild: {
			members: {
				cache: members
			},
			channels: { cache: new Collection<string, any>() },
			roles: { cache: new Collection<string, any>() }
		},
		attachments: { first: () => undefined },
		...extra
	});
	return fake as Message;
}

describe("options on the slash side", () => {
	test("string, longString, number, integer forward name and required", () => {
		const { fake, seen } = slashInteraction({
			getString: "s",
			getNumber: 4.5,
			getInteger: 4
		});
		const o = options(fake);
		expect(o.string("a", 0)).toBe("s");
		expect(o.string("a", 0, true)).toBe("s");
		expect(o.longString("b", 1)).toBe("s");
		expect(o.number("c", 0)).toBe(4.5);
		expect(o.integer("d", 0, true)).toBe(4);
		expect(seen).toEqual([
			["getString", ["a", false]],
			["getString", ["a", true]],
			["getString", ["b", false]],
			["getNumber", ["c", false]],
			["getInteger", ["d", true]]
		]);
	});

	test("member, user, channel, voiceChannel, role, attachment", async () => {
		const member = { id: "m" };
		const user = { id: "u" };
		const chan = { id: "c" };
		const role = { id: "r" };
		const att = { id: "a" };
		const { fake, seen } = slashInteraction({
			getMember: member,
			getUser: user,
			getChannel: chan,
			getRole: role,
			getAttachment: att
		});
		const o = options(fake);
		expect(o.member("x", 0)).toBe(member as any);
		expect(await o.user("x", 0)).toBe(user as any);
		expect(await o.channel("x", 0)).toBe(chan as any);
		expect(await o.voiceChannel("y", 0)).toBe(chan as any);
		expect(o.role("x", 0)).toBe(role as any);
		expect(o.attachment("x")).toBe(att as any);
		expect(seen.map((x) => x[1])).toEqual([
			["x"],
			["x"],
			["x"],
			["y"],
			["x"],
			["x"]
		]);
	});

	test("missing values stay null", () => {
		const { fake } = slashInteraction({});
		const o = options(fake);
		expect(o.string("a", 0) ?? null).toBeNull();
	});
});

describe("options on the prefix side", () => {
	const msg = prefixMessage();

	test("string, longString, number, integer use the args", () => {
		const o = options(msg, ["foo", "12", "bar baz"]);
		expect(o.string("a", 0)).toBe("foo");
		expect(o.string("a", 5)).toBeNull();
		expect(o.longString("a", 1)).toBe("12 bar baz");
		expect(o.longString("a", 9)).toBeNull();
		expect(o.number("a", 1)).toBe(12);
		expect(o.number("a", 0)).toBe(0);
		expect(o.integer("a", 1)).toBe(12);
		expect(o.integer("a", 7)).toBe(0);
	});

	test("missing args behave like an empty array", () => {
		const o = options(msg);
		expect(o.string("a", 0)).toBeNull();
		expect(o.longString("a", 0)).toBeNull();
		expect(o.number("a", 0)).toBe(0);
		expect(o.member("a", 0)).toBeNull();
	});

	test("member resolves mention, id and username like method.member", () => {
		const m = { id: "123", user: { username: "bob" } };
		(msg.guild!.members.cache as any).set("123", m);
		const o = options(msg, ["<@123>", "123", "bob", "nobody"]);
		expect(o.member("a", 0)).toBe(m as any);
		expect(o.member("a", 1)).toBe(m as any);
		expect(o.member("a", 2)).toBe(m as any);
		expect(o.member("a", 3)).toBeNull();
	});

	test("role resolves mention entries, id and name", () => {
		const r = { id: "9", name: "staff" };
		const message = prefixMessage();
		(message.guild!.roles.cache as any).set("9", r);
		const o = options(message, ["<@&9>", "staff", "none"]);
		expect(o.role("a", 0)).toBe(r as any);
		expect(o.role("a", 1)).toBe(r as any);
		expect(o.role("a", 2)).toBeNull();
	});

	test("channel resolves by name and mention", async () => {
		const c = { id: "5", name: "general" };
		const message = prefixMessage();
		(message.guild!.channels.cache as any).set("5", c);
		const o = options(message, ["general", "zzz"]);
		expect(await o.channel("a", 0)).toBe(c as any);
		expect(await o.channel("a", 1)).toBeNull();
	});

	test("voiceChannel returns null without an argument", async () => {
		const o = options(msg, []);
		expect(await o.voiceChannel("a", 0)).toBeNull();
	});

	test("user resolves a mention", async () => {
		const u = { id: "7" };
		const message = prefixMessage({
			content: "!x <@7>",
			mentions: {
				parsedUsers: new Collection([["7", u]]),
				channels: new Collection(),
				roles: new Collection()
			}
		});
		const o = options(message, ["<@7>"]);
		expect(await o.user("a", 0)).toBe(u as any);
	});

	test("attachment returns the first one or null", () => {
		const att = { id: "a" };
		expect(options(msg).attachment("f")).toBeNull();
		const withAtt = prefixMessage({ attachments: { first: () => att } });
		expect(options(withAtt).attachment("f")).toBe(att as any);
	});
});
