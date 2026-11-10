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

import { readyTables } from "../readyTables.ts";
import { describe, expect, mock, test } from "bun:test";
import {
	OverwriteType,
	PermissionFlagsBits,
	PermissionsBitField
} from "discord.js";

mock.module("../../src/Events/client/ready.js", () =>
	readyTables({
		blacklistTable: { get: async () => null },
		metasTable: { get: async () => null }
	})
);

const { ticketsActions, ticketAccess, compareSnowflakeDesc } =
	await import("../../src/core/modules/gatewayLinkActions/tickets.ts");
const { canManageTicket, findTicketByChannel, listTicketEntries } =
	await import("../../src/core/modules/ticketsManager.ts");
const { Params, ActionError } =
	await import("../../src/core/modules/gatewayLinkActions/types.ts");

const GUILD = "100000000000000000";
const AUTHOR = "200000000000000000";
const STAFF = "300000000000000000";
const OTHER = "400000000000000000";
const BOT = "500000000000000000";
const T1 = "600000000000000001";
const T2 = "600000000000000002";
const HIDDEN = "600000000000000003";

const ow = (id: string, allow: bigint, deny: bigint, type = 1) => ({
	id,
	type,
	allow: new PermissionsBitField(allow),
	deny: new PermissionsBitField(deny)
});

const TICKETS = {
	[AUTHOR]: {
		[T1]: { channel: T1, author: AUTHOR, alive: true },
		[T2]: { channel: T2, author: AUTHOR, alive: true }
	},
	[OTHER]: {
		[HIDDEN]: { channel: HIDDEN, author: OTHER, alive: true },
		"700000000000000000": {
			channel: "700000000000000000",
			author: OTHER,
			alive: true
		}
	}
};

function fakeGuild(disabled = false) {
	const db = {
		get: async (key: string) => {
			if (key === `${GUILD}.TICKET_ALL`) return TICKETS;
			if (key === `${GUILD}.GUILD.TICKET.disable`) return disabled;
			return null;
		}
	};
	const channel = (id: string, overwrites: any[]) => ({
		id,
		type: 0,
		name: `ticket-${id.slice(-1)}`,
		createdTimestamp: Number(id.slice(-1)),
		parentId: null,
		parent: null,
		permissionOverwrites: {
			cache: new Map(overwrites.map((o) => [o.id, o]))
		}
	});
	const channels = new Map([
		[
			T1,
			channel(T1, [
				ow(AUTHOR, 0n, PermissionFlagsBits.ViewChannel),
				ow(STAFF, PermissionFlagsBits.ViewChannel, 0n),
				ow(BOT, PermissionFlagsBits.ViewChannel, 0n)
			])
		],
		[T2, channel(T2, [ow(AUTHOR, PermissionFlagsBits.ViewChannel, 0n)])],
		[HIDDEN, channel(HIDDEN, [])]
	]);
	const client = { db, user: { id: BOT }, users: { cache: new Map() } };
	const guild = {
		id: GUILD,
		client,
		channels: { cache: channels },
		members: { cache: new Map() }
	};
	return { client, guild };
}

// The actor sees every channel except HIDDEN.
function actor(id: string, perms = 0n) {
	return {
		id,
		permissions: new PermissionsBitField(perms),
		permissionsIn: (channelId: string) =>
			new PermissionsBitField(
				channelId === HIDDEN
					? 0n
					: PermissionFlagsBits.ViewChannel | perms
			)
	} as any;
}

const run = (
	name: string,
	params: Record<string, unknown>,
	a = actor(STAFF)
) => {
	const { client, guild } = fakeGuild();
	return ticketsActions[name].run({
		client: client as any,
		guild: guild as any,
		actor: a,
		params: new Params(params),
		lang: {} as any
	});
};

const refused = async (p: Promise<unknown>) => {
	const e = await p.then(
		() => null,
		(err) => err
	);
	expect(e).toBeInstanceOf(ActionError);
	return (e as Error).message;
};

describe("tickets: data helpers", () => {
	test("TICKET_ALL is flattened and searched by channel", async () => {
		const { client } = fakeGuild();
		expect(await listTicketEntries(client as any, GUILD)).toHaveLength(4);
		const found = await findTicketByChannel(client as any, GUILD, HIDDEN);
		expect(found?.key).toBe(OTHER);
		expect(found?.data.author).toBe(OTHER);
		expect(await findTicketByChannel(client as any, GUILD, "1")).toBeNull();
	});

	test("closed state and added members come from the overwrites", () => {
		const access = ticketAccess(
			[
				ow(AUTHOR, 0n, PermissionFlagsBits.ViewChannel),
				ow(STAFF, PermissionFlagsBits.ViewChannel, 0n),
				ow(BOT, PermissionFlagsBits.ViewChannel, 0n),
				ow(
					GUILD,
					0n,
					PermissionFlagsBits.ViewChannel,
					OverwriteType.Role
				)
			] as any,
			AUTHOR,
			BOT
		);
		expect(access).toEqual({ closed: true, members: [STAFF] });
	});

	test("ticket staff = author, administrators, channel managers", () => {
		expect(canManageTicket(actor(AUTHOR), T1, AUTHOR)).toBe(true);
		expect(canManageTicket(actor(OTHER), T1, AUTHOR)).toBe(false);
		expect(
			canManageTicket(
				actor(OTHER, PermissionFlagsBits.ManageChannels),
				T1,
				AUTHOR
			)
		).toBe(true);
		expect(
			canManageTicket(
				actor(OTHER, PermissionFlagsBits.Administrator),
				T1,
				AUTHOR
			)
		).toBe(true);
	});

	test("snowflakes sort newest first", () => {
		expect([T1, T2].sort(compareSnowflakeDesc)).toEqual([T2, T1]);
	});
});

describe("tickets: actions", () => {
	test("list only returns the tickets the actor can see", async () => {
		const res = (await run("tickets.list", {})) as any;
		expect(res.tickets.map((t: any) => t.channelId)).toEqual([T2, T1]);
		expect(res.tickets[1].closed).toBe(true);
		expect(res.tickets[1].members.map((m: any) => m.id)).toEqual([STAFF]);
		expect(res.nextCursor).toBeNull();
	});

	test("list paginates with before/limit", async () => {
		const first = (await run("tickets.list", { limit: "1" })) as any;
		expect(first.tickets.map((t: any) => t.channelId)).toEqual([T2]);
		expect(first.nextCursor).toBe(T2);
		const next = (await run("tickets.list", {
			limit: "1",
			before: first.nextCursor
		})) as any;
		expect(next.tickets.map((t: any) => t.channelId)).toEqual([T1]);
		expect(next.nextCursor).toBeNull();
	});

	test("a ticket the actor cannot see is refused", async () => {
		expect(
			await refused(run("tickets.transcript", { channelId: HIDDEN }))
		).toContain("forbidden");
		expect(
			await refused(run("tickets.close", { channelId: HIDDEN }))
		).toContain("forbidden");
	});

	test("unknown channels are not tickets", async () => {
		expect(
			await refused(
				run("tickets.rename", {
					channelId: "800000000000000000",
					name: "x"
				})
			)
		).toContain("not found");
	});

	test("transcript needs ticket staff like /ticket transcript", async () => {
		expect(
			await refused(
				run("tickets.transcript", { channelId: T1 }, actor(OTHER))
			)
		).toContain("forbidden");
	});

	test("a disabled ticket module refuses actions", async () => {
		const { client, guild } = fakeGuild(true);
		const p = ticketsActions["tickets.close"].run({
			client: client as any,
			guild: guild as any,
			actor: actor(STAFF),
			params: new Params({ channelId: T1 }),
			lang: {} as any
		});
		expect(await refused(p)).toContain("disabled");
	});

	test("every action mirrors an existing /ticket subcommand", () => {
		for (const def of Object.values(ticketsActions)) {
			expect(def.command).toMatch(
				/^ticket (transcript|close|open|delete|rename|add-member|remove-member|remind)$/
			);
		}
	});
});
