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
import { beforeEach, expect, mock, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";

mock.module("../../src/Events/client/ready.js", () => readyTables());

const ready = await import("../../src/Events/client/ready.js");
const { authRestoreKeyInForce } =
	await import("../../src/core/functions/authRestoreHelper.ts");
const { command } =
	await import("../../src/Interaction/SlashCommands/authrestore/authrestore.ts");
const { subCommand: setCommand } =
	await import("../../src/Interaction/SlashCommands/authrestore/!set.ts");
const { subCommand: deleteCommand } =
	await import("../../src/Interaction/SlashCommands/authrestore/!delete.ts");

const GUILD = "111111111111111111";
const KEY = "AbCdEfGhIjKlMnOpQrStUvWx";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lang: any = new Proxy({}, { get: (_t, key) => String(key) });

let entry: unknown = null;
// The ready.js fake is shared by the test files of the process: patch the
// table it hands out instead of mocking the module a second time.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(ready as any).authRestoreTable.get = async (id: string) =>
	id === GUILD ? entry : null;

beforeEach(() => {
	entry = null;
});

/** A server whose button record and channel are given; records every call. */
function fixture(options: {
	record: unknown;
	channel?: { messages: { fetch: (id: string) => Promise<unknown> } };
}) {
	const sent: { content?: string; flags?: unknown }[] = [];
	const deleted: string[] = [];
	const fetched: string[] = [];
	const channels = new Map<string, unknown>();
	if (options.channel) channels.set("222", options.channel);
	const client = {
		user: { id: "999" },
		config: { api: { apiToken: "t" } },
		db: {
			get: async (path: string) =>
				path === `${GUILD}.GUILD.RESTORECORD` ? options.record : null,
			delete: async (path: string) => void deleted.push(path),
			set: async () => undefined
		},
		func: {
			method: {
				interactionSend: async (
					_i: unknown,
					payload: { content?: string; flags?: unknown }
				) => void sent.push(payload)
			}
		}
	};
	const interaction = {
		member: {},
		user: { id: "1", toString: () => "<@1>" },
		guildId: GUILD,
		guild: { id: GUILD, name: "Guild", channels: { cache: channels } },
		channel: {},
		options: {
			getChannel: () => ({
				id: "222",
				messages: {
					fetch: async (id: string) => {
						fetched.push(id);
						throw new Error("stop here");
					}
				}
			}),
			getString: () => "333",
			getRole: () => ({ id: "444" })
		}
	};
	return { client, interaction, sent, deleted, fetched };
}

test("a server keeps its key while its verify button is set up", () => {
	const key = { config: { securityCode: KEY } };
	const button = { channelId: "222", messageId: "333" };
	expect(authRestoreKeyInForce(button, key as never)).toBe(true);
	// Button removed by /authrestore delete: set may give a new key.
	expect(authRestoreKeyInForce(null, key as never)).toBe(false);
	// Never configured, or a config without a key.
	expect(authRestoreKeyInForce(button, null)).toBe(false);
	expect(authRestoreKeyInForce(button, { config: {} } as never)).toBe(false);
});

test("/authrestore set refuses to replace a key in force and says how to start over", async () => {
	entry = { config: { securityCode: KEY }, members: [] };
	const f = fixture({ record: { channelId: "222", messageId: "333" } });
	await setCommand.run(f.client as never, f.interaction as never, lang);
	expect(f.sent).toHaveLength(1);
	expect(f.sent[0].content).toBe("rc_set_key_already_set");
	expect(f.sent[0].flags).toEqual([1 << 6]);
	// Nothing was touched: no message fetched, no new key asked for.
	expect(f.fetched).toEqual([]);
});

test("/authrestore set still runs after /authrestore delete removed the button", async () => {
	entry = { config: { securityCode: KEY }, members: ["5"] };
	const f = fixture({ record: null });
	await setCommand.run(f.client as never, f.interaction as never, lang);
	expect(f.fetched).toEqual(["333"]);
	expect(f.sent.map((s) => s.content)).not.toContain(
		"rc_set_key_already_set"
	);
});

test("every language explains the refusal and names /authrestore delete", async () => {
	const dir = "src/lang";
	const files = readdirSync(dir).filter((f) =>
		/^[a-z]{2}-[A-Z]{2}\.ts$/.test(f)
	);
	expect(files.length).toBe(13);
	for (const file of files) {
		// The loaded value, not the source text: Prettier may wrap it.
		const lang = (await import(`../../${dir}/${file}`)).default;
		const text: string = lang.rc_set_key_already_set;
		expect(typeof text).toBe("string");
		expect(text).toContain("/authrestore delete");
		expect(text).toContain("/authrestore set");
	}
});

test("/authrestore delete clears the button record when its message is gone, so set is not locked forever", async () => {
	for (const channel of [
		undefined,
		{
			messages: {
				fetch: async () => {
					throw Object.assign(new Error("Unknown Message"), {
						code: 10008
					});
				}
			}
		}
	]) {
		const f = fixture({
			record: { channelId: "222", messageId: "333" },
			channel
		});
		await deleteCommand.run(
			f.client as never,
			f.interaction as never,
			lang
		);
		expect(f.deleted).toEqual([`${GUILD}.GUILD.RESTORECORD`]);
		expect(f.sent.map((s) => s.content)).toEqual(["rc_delete_command_ok"]);
	}
});

test("/authrestore delete keeps the record when Discord fails for another reason", async () => {
	const f = fixture({
		record: { channelId: "222", messageId: "333" },
		channel: {
			messages: {
				fetch: async () => {
					throw Object.assign(new Error("Missing Access"), {
						code: 50001
					});
				}
			}
		}
	});
	await deleteCommand.run(f.client as never, f.interaction as never, lang);
	expect(f.deleted).toEqual([]);
	expect(f.sent.map((s) => s.content)).toEqual([
		"reactionroles_cant_fetched_reaction_remove"
	]);
});

test("/authrestore get answers privately: the reply lists the verified members", () => {
	const get = command.options!.find((o) => o.name === "get") as {
		thinking?: boolean;
		ephemeral?: boolean;
	};
	// commandExecutor defers a subcommand with its own `ephemeral`.
	expect(get.thinking).toBe(true);
	expect(get.ephemeral).toBe(true);
	// A slash command only: no prefix use could post it in public.
	const source = readFileSync(
		"src/Interaction/SlashCommands/authrestore/!get.ts",
		"utf8"
	);
	expect(source).not.toContain("message.edit(");
});
