import { describe, expect, test } from "bun:test";

import { withParams } from "../../src/core/functions/axios.js";

describe("axios params are sent, like axios", () => {
	test("added as a query string, null and undefined left out", () => {
		expect(
			withParams("https://a.b/c", {
				q: "two words",
				n: 3,
				on: true,
				skip: undefined,
				no: null
			})
		).toBe("https://a.b/c?q=two+words&n=3&on=true");
		expect(withParams("https://a.b/c?x=1", { y: 2 })).toBe(
			"https://a.b/c?x=1&y=2"
		);
		expect(withParams("https://a.b/c", {})).toBe("https://a.b/c");
		expect(withParams("https://a.b/c", undefined)).toBe("https://a.b/c");
	});
});

describe("client.func.roleSelectMenu is the module the loader puts there", () => {
	test("no default export: generateSelectMenu is reached through the module", async () => {
		const mod =
			(await import("../../src/core/functions/roleSelectMenu.js")) as Record<
				string,
				unknown
			>;
		// loadAnotherStuff.ts stores `module.default || module`.
		const loaded = (mod.default || mod) as { generateSelectMenu?: unknown };
		expect(typeof loaded).not.toBe("function");
		expect(typeof loaded.generateSelectMenu).toBe("function");
	});
});
