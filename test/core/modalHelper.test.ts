import { describe, expect, test } from "bun:test";
import { TextInputStyle } from "discord.js";

import { iHorizonModalBuilder } from "../../src/core/functions/modalHelper.ts";

// The text inputs of a built modal, as sent to Discord.
function textInputs(modal: ReturnType<typeof iHorizonModalBuilder>) {
	// Already the API payload.
	return (modal as unknown as { components: any[] }).components.map(
		(label) => label.component
	);
}

describe("modal text inputs", () => {
	test("no hidden minimum length when the field sets none", () => {
		const [input] = textInputs(
			iHorizonModalBuilder({
				customId: "m",
				title: "t",
				deferUpdate: false,
				fields: [
					{
						customId: "prize",
						label: "Prize",
						style: TextInputStyle.Short,
						required: true,
						maxLength: 64
					}
				]
			})
		);
		expect(input.min_length).toBeUndefined();
	});

	test('the /gw go duration accepts two characters ("1h")', () => {
		const [input] = textInputs(
			iHorizonModalBuilder({
				customId: "gw_go_modal_duration",
				title: "t",
				deferUpdate: false,
				fields: [
					{
						customId: "duration",
						label: "Duration",
						style: TextInputStyle.Short,
						required: true,
						minLength: 2,
						maxLength: 32
					}
				]
			})
		);
		expect(input.min_length).toBe(2);
	});
});
