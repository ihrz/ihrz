import { describe, expect, mock, test } from "bun:test";
import { readdirSync } from "node:fs";

mock.module("../../src/core/core.js", () => ({ default: {} }));

const { buildServerBio } =
	await import("../../src/core/functions/customProfileHelper.ts");

// The longest a real emoji can be with the short names (19-digit ids).
const emojis = {
	ih1: "<:ih1:1574776263028121684>",
	ih2: "<:ih2:1574776257885896764>",
	ih3: "<:ih3:1574776261556052029>",
	ih4: "<:ih4:1574776260008353854>"
};

describe("server bio", () => {
	test("fills the 2x2 logo and the command count", () => {
		const bio = buildServerBio(
			"{logo_tl}{logo_tr} **`+{count}`**\n{logo_bl}{logo_br} x",
			emojis,
			380
		);
		expect(bio).toBe(
			`${emojis.ih1}${emojis.ih2} **\`+380\`**\n${emojis.ih3}${emojis.ih4} x`
		);
	});

	test("an emoji not created yet leaves its slot empty", () => {
		expect(buildServerBio("{logo_tl}A{logo_br}", {}, 1)).toBe("A");
	});

	test("every language fits Discord's 190 characters, all three lines kept", async () => {
		const files = readdirSync("src/lang").filter((f) =>
			/^[a-z]{2}-[A-Z]{2}\.ts$/.test(f)
		);
		expect(files.length).toBe(13);
		for (const file of files) {
			const lang = (await import(`../../src/lang/${file}`)).default;
			// Command counts up to 999.
			const bio = buildServerBio(lang.bot_server_bio, emojis, 999);
			expect(bio.length, file).toBeLessThanOrEqual(190);
			expect(bio.split("\n").length, file).toBe(3);
			for (const e of Object.values(emojis))
				expect(bio, file).toContain(e);
			expect(bio, file).toContain("https://www.ihorizon.org");
		}
	});
});
