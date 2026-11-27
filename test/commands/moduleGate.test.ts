import { readyTables } from "../readyTables.ts";
import { describe, expect, mock, test } from "bun:test";

mock.module("../../src/Events/client/ready.js", () => readyTables());

const { refusedByModule } = await import("../../src/core/commandExecutor.ts");
const en = (await import("../../src/lang/en-US.ts")).default;

type Ctx = Parameters<typeof refusedByModule>[0];

function context(
	values: Record<string, unknown>,
	command: Record<string, unknown>,
	target: Record<string, unknown>
) {
	const sent: string[] = [];
	const client = {
		db: { get: async (key: string) => values[key] ?? null },
		func: {
			method: {
				interactionSend: async (
					_i: unknown,
					o: { content: string }
				) => {
					sent.push(o.content);
				}
			}
		}
	};
	const ctx = {
		client,
		source: { guildId: "1", user: { id: "42" }, isRepliable: () => true },
		lang: en,
		command,
		target,
		args: [],
		commandPath: "x"
	} as unknown as Ctx;
	return { ctx, sent };
}

describe("refusedByModule", () => {
	test("a subcommand of a module turned off is refused with the module's refusal", async () => {
		const { ctx, sent } = context(
			{ "1.GUILD.FUN.states": "off" },
			{ name: "fun", module: "fun" },
			{ name: "gay" }
		);
		expect(await refusedByModule(ctx)).toBe(true);
		expect(sent).toEqual([en.fun_category_disable]);
	});

	test("moduleFree runs anyway (the config that turns it back on)", async () => {
		const { ctx, sent } = context(
			{ "1.GUILD.FUN.states": "off" },
			{ name: "fun", module: "fun" },
			{ name: "config", moduleFree: true }
		);
		expect(await refusedByModule(ctx)).toBe(false);
		expect(sent).toEqual([]);
	});

	test("moduleRefusal replaces the message", async () => {
		const { ctx, sent } = context(
			{ "1.GUILD.TICKET.disable": true },
			{ name: "ticket", module: "ticket" },
			{ name: "open", moduleRefusal: "open_disabled_command" }
		);
		expect(await refusedByModule(ctx)).toBe(true);
		expect(sent).toEqual([en.open_disabled_command]);
	});

	test("no module, or the module on: nothing is said", async () => {
		const off = context(
			{ "1.GUILD.FUN.states": "off" },
			{ name: "ping" },
			{ name: "ping" }
		);
		expect(await refusedByModule(off.ctx)).toBe(false);
		const on = context(
			{},
			{ name: "economy", module: "economy" },
			{ name: "daily" }
		);
		expect(await refusedByModule(on.ctx)).toBe(false);
		expect([...off.sent, ...on.sent]).toEqual([]);
	});
});
