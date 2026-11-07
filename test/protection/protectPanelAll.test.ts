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

import { expect, test } from "bun:test";
import { EventEmitter } from "node:events";

import { openProtectPanel } from "../../src/Interaction/HybridCommands/protection/protectPanel.ts";

const RULES = [
	"webhook",
	"updateguild",
	"createchannel",
	"updatechannel",
	"deletechannel",
	"createrole",
	"deleterole",
	"updaterole",
	"add_admin_roles",
	"updatemember",
	"banmembers",
	"kickmember",
	"unbanmembers"
];

// Nested-key store, like the bot's database drivers.
function makeDb(initial: Record<string, unknown>) {
	const root: Record<string, any> = structuredClone(initial);
	const walk = (key: string, create: boolean) => {
		const parts = key.split(".");
		let node: any = root;
		for (const part of parts.slice(0, -1)) {
			if (node[part] === undefined) {
				if (!create) return [undefined, parts.at(-1)!] as const;
				node[part] = {};
			}
			node = node[part];
		}
		return [node, parts.at(-1)!] as const;
	};
	return {
		root,
		get: async (key: string) => {
			const [node, last] = walk(key, false);
			return structuredClone(node?.[last] ?? null);
		},
		set: async (key: string, value: unknown) => {
			const [node, last] = walk(key, true);
			node[last] = structuredClone(value);
		},
		delete: async (key: string) => {
			const [node, last] = walk(key, false);
			if (node) delete node[last];
		}
	};
}

test("All rules: enable, set mode and sanction, then disable every rule", async () => {
	const db = makeDb({
		g: { PROTECTION: { webhook: { mode: "allowlist" } } }
	});
	const collector = new EventEmitter();
	const feedback: string[] = [];
	let panel: any = null;
	const message: any = {
		edit: async (payload: any) => {
			panel = payload.components[0].toJSON();
		},
		createMessageComponentCollector: () => collector
	};
	const lang = new Proxy({}, { get: (_t, k) => String(k) }) as any;
	const client: any = {
		user: { id: "bot" },
		db,
		iHorizon_Emojis: new Proxy(
			{},
			{ get: () => "<:icon:123456789012345678>" }
		),
		func: { method: { interactionSend: async () => message } }
	};
	const interaction: any = {
		guildId: "g",
		member: { user: { id: "owner" } },
		channel: {},
		guild: {
			id: "g",
			members: { me: { permissions: { has: () => true } } }
		}
	};

	await openProtectPanel(client, interaction, lang);

	const click = async (customId: string, values?: string[]) => {
		collector.emit("collect", {
			user: { id: "owner" },
			customId,
			values,
			isStringSelectMenu: () => values !== undefined,
			isButton: () => values === undefined,
			deferUpdate: async () => {},
			followUp: async (x: any) => feedback.push(x.content)
		});
		await Bun.sleep(20);
	};
	const text = () => JSON.stringify(panel);
	const stored = () => db.root.g.PROTECTION;

	// The rule select offers "All rules" first.
	const ruleSelect = panel.components
		.flatMap((c: any) => c.components ?? [])
		.find((c: any) => c.custom_id === "protect-panel-rule-select");
	expect(ruleSelect.options[0].value).toBe("all");
	expect(ruleSelect.options).toHaveLength(RULES.length + 1);

	await click("protect-panel-rule-select", ["all"]);
	expect(text()).toContain("protect_panel_all_rules");
	expect(text()).toContain("protect-panel-enable-all");

	await click("protect-panel-enable-all");
	expect(Object.keys(stored()).sort()).toEqual([...RULES].sort());
	expect(feedback.at(-1)).toBe(
		"protect_panel_all_enabled".replace("${ruleCount}", "12")
	);

	await click("protect-panel-mode", ["nobody"]);
	expect(RULES.every((r) => stored()[r].mode === "nobody")).toBe(true);

	await click("protect-panel-sanction", ["simply+ban"]);
	expect(
		RULES.every(
			(r) =>
				stored()[r].sanction === "simply+ban" &&
				stored()[r].mode === "nobody"
		)
	).toBe(true);

	await click("protect-panel-sanction", ["global"]);
	expect(RULES.every((r) => stored()[r].sanction === undefined)).toBe(true);

	await click("protect-panel-disable-all");
	expect(Object.keys(stored())).toEqual([]);
	expect(
		feedback.some((f) => f.startsWith("protect_panel_all_disabled"))
	).toBe(true);

	// No rule left: the bulk mode and sanction menus are locked.
	const selects = panel.components
		.flatMap((c: any) => c.components ?? [])
		.filter(
			(c: any) =>
				c.custom_id === "protect-panel-mode" ||
				c.custom_id === "protect-panel-sanction"
		);
	expect(selects).toHaveLength(2);
	expect(selects.every((c: any) => c.disabled)).toBe(true);
	collector.emit("end");
});
