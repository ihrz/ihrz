import { describe, expect, test } from "bun:test";

import { entryPointCommands } from "../../src/core/commandsSync.js";

describe("command sync keeps the Activity's Entry Point command", () => {
	test("only type 4 is kept, as Discord has it", () => {
		const existing = [
			{ id: "1", name: "ping", type: 1, description: "x", version: "9" },
			{
				id: "2",
				name: "launch",
				type: 4,
				description: "",
				handler: 2,
				integration_types: [0, 1],
				contexts: [0, 1, 2],
				version: "7",
				application_id: "3"
			}
		];
		expect(entryPointCommands(existing)).toEqual([
			{
				id: "2",
				name: "launch",
				type: 4,
				description: "",
				handler: 2,
				integration_types: [0, 1],
				contexts: [0, 1, 2]
			}
		]);
	});

	test("nothing to keep: an app without Activities, or a failed read", () => {
		expect(
			entryPointCommands([{ id: "1", name: "ping", type: 1 }])
		).toEqual([]);
		expect(entryPointCommands(null)).toEqual([]);
		expect(entryPointCommands({ message: "401: Unauthorized" })).toEqual(
			[]
		);
	});
});
