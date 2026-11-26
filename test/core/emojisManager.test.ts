import { describe, expect, mock, test } from "bun:test";

mock.module("../../src/core/core.js", () => ({ default: {} }));
const { EmojisManager } =
	await import("../../src/core/modules/emojisManager.ts");

describe("application emojis", () => {
	test("emojis without the iHorizon prefix (ih1..ih4) are seen, not recreated", async () => {
		const rest = {
			get: async () => ({
				items: [
					{ id: "1", name: "iHorizon_Wink", animated: false },
					{ id: "2", name: "ih1", animated: false },
					{ id: "3", name: "ih4", animated: true },
					{ id: "4", name: null }
				]
			})
		};
		const manager = new EmojisManager({
			rest: rest as never,
			applicationId: "123"
		});
		// Private method, reached on purpose.
		const list = await (
			manager as unknown as {
				fetchCurrentApplicationEmojis(): Promise<
					{ Name: string; FormatedName: string }[]
				>;
			}
		).fetchCurrentApplicationEmojis();
		const names = list.map((e) => e.Name);
		expect(names).toEqual(["iHorizon_Wink", "ih1", "ih4"]);
		expect(list.find((e) => e.Name === "ih4")!.FormatedName).toBe(
			"<a:ih4:3>"
		);
	});
});
