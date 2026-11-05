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

import {
	APO_MAX_BYTES,
	APO_MAX_CONFIGS,
	activeConfig,
	addConfig,
	canUnfreeze,
	checkName,
	checkText,
	cleanName,
	commandLines,
	emptyState,
	migrate,
	removeConfig,
	updateConfig
} from "../../src/core/modules/musicApoState.ts";

test("the old single-config shape becomes one applied config", () => {
	const s = migrate({
		config: "Preamp: -3 dB",
		name: "bass.txt",
		by: "1",
		at: 5
	});
	expect(s.enabled).toBe(true);
	expect(s.configs.length).toBe(1);
	expect(s.configs[0].name).toBe("bass");
	expect(activeConfig(s)?.config).toBe("Preamp: -3 dB");
	expect(migrate(null)).toEqual(emptyState());
	expect(migrate("garbage")).toEqual(emptyState());
});

test("migration keeps at most five configs and drops a dangling active id", () => {
	const configs = Array.from({ length: 7 }, (_, i) => ({
		id: `c${i}`,
		name: `n${i}`,
		config: "x",
		by: "1",
		at: i,
		frozen: null
	}));
	const s = migrate({ enabled: false, active: "nope", configs });
	expect(s.configs.length).toBe(APO_MAX_CONFIGS);
	expect(s.active).toBeNull();
	expect(s.enabled).toBe(false);
});

test("limits: size, command lines, empty text", () => {
	expect(checkText("")).toBe("empty");
	expect(checkText("x".repeat(APO_MAX_BYTES + 1))).toBe("too_big");
	const fifty = Array.from({ length: 50 }, () => "Preamp: -1 dB").join("\n");
	expect(checkText(fifty)).toBeNull();
	expect(checkText(`${fifty}\nPreamp: -1 dB`)).toBe("too_many_lines");
	expect(
		commandLines(
			"# comment\n\n  \nPreamp: 1 dB\n  # other\nFilter: ON PK Fc 1 Hz Gain 1 dB Q 1"
		)
	).toBe(2);
});

test("names are cleaned and unique, ignoring case", () => {
	expect(cleanName("  My   Bass.TXT ")).toBe("My Bass");
	expect(cleanName("a\nb")).toBe("a b");
	expect(cleanName("x".repeat(50)).length).toBe(32);
	let s = addConfig(emptyState(), "Bass", "a", "1", 1);
	expect(checkName(s, "bass")).toBe("taken");
	expect(checkName(s, "bass", s.configs[0].id)).toBeNull();
	expect(checkName(s, "   ")).toBe("empty");
	s = addConfig(s, "Vocal", "b", "1", 2);
	expect(s.active).toBe(s.configs[0].id); // the first stays applied
});

test("update, freeze rules and removal", () => {
	let s = addConfig(emptyState(), "Bass", "a", "1", 1);
	const id = s.configs[0].id;
	s = updateConfig(
		s,
		id,
		{ name: "Deep bass", frozen: { by: "2", at: 3 } },
		"2",
		3
	);
	expect(s.configs[0].name).toBe("Deep bass");
	expect(s.configs[0].updatedBy).toBe("2");
	expect(canUnfreeze(s.configs[0], "2", false)).toBe(true);
	expect(canUnfreeze(s.configs[0], "3", false)).toBe(false);
	expect(canUnfreeze(s.configs[0], "3", true)).toBe(true);
	s = removeConfig(s, id);
	expect(s.configs.length).toBe(0);
	expect(s.active).toBeNull();
	expect(activeConfig({ ...s, enabled: false })).toBeNull();
});
