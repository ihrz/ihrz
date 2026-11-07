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

import { describe, expect, mock, test } from "bun:test";

import {
	AutoModerationRuleTriggerType,
	Collection,
	type Guild
} from "discord.js";

import {
	automodToggles,
	setNativeRuleEnabled
} from "../../src/core/modules/automodRules.ts";

const ROLE = "600000000000000001";
const GONE = "600000000000000002";
const LOGS = "500000000000000001";

function rule(id: string, fields: Record<string, unknown>) {
	return {
		id,
		enabled: false,
		name: "x",
		triggerType: AutoModerationRuleTriggerType.Keyword,
		triggerMetadata: {},
		actions: [],
		exemptRoles: new Collection<string, unknown>(),
		edit: mock(async () => {}),
		setEnabled: mock(async () => {}),
		...fields
	};
}

function fakeGuild(rules: ReturnType<typeof rule>[]) {
	const create = mock(async () => {});
	const guild = {
		autoModerationRules: {
			fetch: async () => new Collection(rules.map((r) => [r.id, r])),
			create
		},
		roles: { cache: new Collection([[ROLE, {}]]) },
		channels: { cache: new Collection([[LOGS, {}]]) }
	} as unknown as Guild;
	return { guild, create };
}

const firstArg = (fn: ReturnType<typeof mock>) =>
	(fn.mock.calls[0] as unknown[])[0] as Record<string, any>;

describe("setNativeRuleEnabled", () => {
	test("creates a missing rule with the panel's roles and logs", async () => {
		const { guild, create } = fakeGuild([]);
		await setNativeRuleEnabled(guild, "spam", true, {
			spam: { bypassRoles: [ROLE, GONE], logsChannel: LOGS }
		});
		const data = firstArg(create);
		expect(data.triggerType).toBe(AutoModerationRuleTriggerType.Spam);
		expect(data.enabled).toBe(true);
		expect(data.exemptRoles).toEqual([ROLE]);
		expect(data.actions[1].metadata.channel).toBe(LOGS);
	});

	test("an existing rule keeps its roles and mention limit", async () => {
		const existing = rule("1", {
			triggerType: AutoModerationRuleTriggerType.MentionSpam,
			triggerMetadata: { mentionTotalLimit: 12 },
			exemptRoles: new Collection([[ROLE, {}]])
		});
		const { guild, create } = fakeGuild([existing]);
		await setNativeRuleEnabled(guild, "mass_mention", true, null);
		expect(create).not.toHaveBeenCalled();
		const data = firstArg(existing.edit);
		expect(data.triggerMetadata.mentionTotalLimit).toBe(12);
		expect(data.exemptRoles).toEqual([ROLE]);
	});

	test("a new mention rule gets the default limit", async () => {
		const { guild, create } = fakeGuild([]);
		await setNativeRuleEnabled(guild, "mass_mention", true, null);
		expect(firstArg(create).triggerMetadata.mentionTotalLimit).toBe(3);
	});

	test("disabling keeps the rule, and does nothing when there is none", async () => {
		const existing = rule("1", {
			triggerType: AutoModerationRuleTriggerType.Spam
		});
		const { guild, create } = fakeGuild([existing]);
		await setNativeRuleEnabled(guild, "spam", false, null);
		expect(existing.setEnabled).toHaveBeenCalledWith(false);

		const empty = fakeGuild([]);
		await setNativeRuleEnabled(empty.guild, "spam", false, null);
		expect(create).not.toHaveBeenCalled();
		expect(empty.create).not.toHaveBeenCalled();
	});

	test("links and invites share a name and stay two rules", async () => {
		// Enabling each one writes a rule the other doesn't recognize.
		const { guild, create } = fakeGuild([]);
		await setNativeRuleEnabled(guild, "antipub", true, null);
		await setNativeRuleEnabled(guild, "media", true, null);
		const [links, invites] = create.mock.calls.map(
			(call) => (call as unknown[])[0] as Record<string, any>
		);
		expect(links.name).toBe(invites.name);

		const stored = [links, invites].map((data, i) =>
			rule(String(i), {
				name: data.name,
				triggerMetadata: data.triggerMetadata
			})
		);
		const both = fakeGuild(stored);
		await setNativeRuleEnabled(both.guild, "media", false, null);
		expect(stored[1].setEnabled).toHaveBeenCalledWith(false);
		expect(stored[0].setEnabled).not.toHaveBeenCalled();
	});
});

describe("automodToggles", () => {
	test("only what changes; absent is off", () => {
		expect(automodToggles(null, { spam: "off", media: false })).toEqual([]);
		expect(automodToggles({ spam: "on" }, { spam: "on" })).toEqual([]);
		expect(
			automodToggles(
				{ spam: "on", media: true },
				{
					mass_mention: "on",
					spam: "off",
					media: false,
					antipub: "off"
				}
			)
		).toEqual([
			{ key: "spam", enabled: false },
			{ key: "mass_mention", enabled: true },
			{ key: "media", enabled: false }
		]);
	});

	test("deleting the section turns the rules off", () => {
		expect(automodToggles({ antipub: "on" }, null)).toEqual([
			{ key: "antipub", enabled: false }
		]);
	});

	test("unrelated settings are not rules", () => {
		expect(automodToggles({ join: "1" }, { join: "2" })).toEqual([]);
	});
});
