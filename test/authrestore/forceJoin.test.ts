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
import { expect, mock, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";

mock.module("../../src/Events/client/ready.js", () => readyTables());

const { FORCE_JOIN_BATCH, forceJoinInBatches, sendKeyByDm } =
	await import("../../src/core/functions/authRestoreHelper.ts");
const { command } =
	await import("../../src/Interaction/SlashCommands/authrestore/authrestore.ts");

type Listener = (arg?: unknown) => void;

/** A gateway socket that adds every member of the batch, then ends. */
function fakeSocket(newKey: string, batchSize: () => number) {
	const listeners = new Map<string, Listener[]>();
	const emit = (event: string, arg?: unknown) =>
		(listeners.get(event) ?? []).forEach((l) => l(arg));
	const msg = (text: string) => emit("message", { toString: () => text });
	queueMicrotask(() => emit("open"));
	return {
		on(event: string, listener: Listener) {
			listeners.set(event, [...(listeners.get(event) ?? []), listener]);
		},
		send() {
			queueMicrotask(() => {
				msg(`forceJoinMember:size:${batchSize()}`);
				msg("forceJoinMember:start");
				for (let i = 0; i < batchSize(); i++) {
					msg(`forceJoinMember:add:${i}`);
				}
				msg(`forceJoinMember:end:${newKey}`);
				emit("close");
			});
		},
		terminate() {}
	};
}

const ids = (n: number) =>
	Array.from({ length: n }, (_, i) => String(1e17 + i));

test("a force-join of more members than the gateway takes runs in batches, each with the key the previous one returned", async () => {
	const calls: { size: number; secretCode: string }[] = [];
	let current = 0;
	const result = await forceJoinInBatches({
		members: ids(1200),
		secretCode: "KEY0",
		guildId: "1",
		targetGuildId: "2",
		apiToken: "t",
		post: async (data) => {
			expect(data.membersToForceJoin.length).toBeLessThanOrEqual(
				FORCE_JOIN_BATCH
			);
			calls.push({
				size: data.membersToForceJoin.length,
				secretCode: data.secretCode
			});
			current = data.membersToForceJoin.length;
			return { status: "OK", message: `ws://gw%code${calls.length}` };
		},
		openSocket: () => fakeSocket(`KEY${calls.length}`, () => current)
	});
	expect(calls).toEqual([
		{ size: 500, secretCode: "KEY0" },
		{ size: 500, secretCode: "KEY1" },
		{ size: 200, secretCode: "KEY2" }
	]);
	expect(result).toEqual({ added: 1200, secretCode: "KEY3", renewed: true });
});

test("a batch that fails after another went through still hands back the key in force", async () => {
	let n = 0;
	const result = await forceJoinInBatches({
		members: ids(700),
		secretCode: "KEY0",
		guildId: "1",
		targetGuildId: "2",
		apiToken: "t",
		post: async () => {
			n++;
			return n === 1
				? { status: "OK", message: "ws://gw%code" }
				: { status: "ERR", message: "Wrong parameter" };
		},
		openSocket: () => fakeSocket("KEY1", () => 500)
	});
	expect(result.renewed).toBe(true);
	expect(result.secretCode).toBe("KEY1");
	expect(result.added).toBe(500);
	expect(result.error).toContain("Wrong parameter");
});

test("a refused force-join reports an error instead of failing silently, and the key is unchanged", async () => {
	const result = await forceJoinInBatches({
		members: ids(3),
		secretCode: "KEY0",
		guildId: "1",
		targetGuildId: "2",
		apiToken: "t",
		post: async () => ({ status: "ERR", message: "Wrong parameter" }),
		openSocket: () => {
			throw new Error("must not open a socket");
		}
	});
	expect(result).toMatchObject({
		added: 0,
		secretCode: "KEY0",
		renewed: false
	});
	expect(result.error).toBeTruthy();
});

test("the key DM reports a blocked DM once, and never also says it was sent", async () => {
	const told: boolean[] = [];
	await sendKeyByDm(
		async () => {
			throw new Error("Cannot send messages to this user");
		},
		async (delivered) => void told.push(delivered)
	);
	await sendKeyByDm(
		async () => undefined,
		async (delivered) => void told.push(delivered)
	);
	expect(told).toEqual([false, true]);
});

test("/authrestore set requires the role the verification gives", () => {
	const set = command.options!.find((o) => o.name === "set") as {
		options: { name: string; required?: boolean }[];
	};
	expect(set.options.find((o) => o.name === "role")?.required).toBe(true);
});

test("/authrestore delete no longer claims the key and members are erased after 48 hours", () => {
	const dir = new URL("../../src/lang/", import.meta.url);
	for (const file of readdirSync(dir).filter((f) =>
		/^[a-z]{2}-[A-Z]{2}\.ts$/.test(f)
	)) {
		const source = readFileSync(new URL(file, dir), "utf8");
		const line = source.slice(
			source.indexOf("\trc_delete_command_ok:"),
			source.indexOf("\n\n", source.indexOf("\trc_delete_command_ok:"))
		);
		expect(line).toContain("/authrestore force-join");
		expect(line).not.toContain("48");
	}
});
