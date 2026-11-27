import { describe, expect, test } from "bun:test";

import { supportCard } from "../../src/Interaction/HybridCommands/guildconfig/support.ts";
import en from "../../src/lang/en-US.ts";

type Guild = Parameters<typeof supportCard>[1];
const guild = (vanity: string | null) =>
	({ vanityURLCode: vanity, iconURL: () => null }) as unknown as Guild;
const json = (c: ReturnType<typeof supportCard>) => JSON.stringify(c.toJSON());

describe("/support card", () => {
	test("says the condition, the keyword and the role", () => {
		const card = json(
			supportCard(
				en,
				guild(null),
				{ type: "either", input: "test_test", rolesId: "1" },
				"42"
			)
		);
		expect(card).toContain("**or**");
		expect(card).toContain("test_test");
		expect(card).toContain("<@&42>");
		expect(card).not.toContain(en.support_card_no_keyword);
	});

	test("the vanity code is shown when there is no keyword", () => {
		const card = json(
			supportCard(
				en,
				guild("ihorizon"),
				{ type: "bio", input: null, rolesId: "1" },
				"42"
			)
		);
		expect(card).toContain("discord.gg/ihorizon");
		expect(card).not.toContain(en.support_card_no_keyword);
	});

	test("warns when nothing can match the status", () => {
		const card = json(
			supportCard(
				en,
				guild(null),
				{ type: "both", input: "  ", rolesId: "1" },
				"42"
			)
		);
		expect(card).toContain(en.support_card_no_keyword);
	});

	test("the tag mode shows no keyword", () => {
		const card = json(
			supportCard(
				en,
				guild(null),
				{ type: "tag", input: null, rolesId: "1" },
				"42"
			)
		);
		expect(card).toContain(en.support_card_cond_tag);
		expect(card).not.toContain(en.support_card_keyword);
		expect(card).not.toContain(en.support_card_no_keyword);
	});
});
