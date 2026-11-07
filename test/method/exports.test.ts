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

(globalThis as { client?: unknown }).client ??= {
	user: { id: "bot" },
	func: {}
};

const method = await import("../../src/core/functions/method.ts");

// Type-only exports, checked by `bun run build`.
export type MethodTypes = [
	import("../../src/core/functions/method.ts").HybridOptions,
	import("../../src/core/functions/method.ts").PunishTarget,
	import("../../src/core/functions/method.ts").components
];

// Every runtime export of method.ts before it was split into ./method/.
const EXPECTED = [
	"addCoins",
	"addTopggButonToTheActualComponents",
	"boldStringifyOption",
	"buttonReact",
	"buttonUnreact",
	"changeVoiceChannelStatus",
	"channel",
	"channelSend",
	"checkCommandArgs",
	"createAwesomeEmbed",
	"deleteTicketChannelFromDatabase",
	"derank",
	"findOptionRecursively",
	"generateCustomMessagePreview",
	"generateTopggActionRow",
	"getArgumentOptionNameWithOptions",
	"getDangerousPermissions",
	"hasSubCommand",
	"hasSubCommandGroup",
	"interactionSend",
	"isAnimated",
	"isNumber",
	"isSubCommand",
	"isTicketChannel",
	"isValidDiscordInvite",
	"isValidDiscordInviteCode",
	"longString",
	"member",
	"number",
	"options",
	"punish",
	"reply",
	"role",
	"shouldAdvertiseTheTopggVoteButton",
	"string",
	"stringifyOption",
	"subCoins",
	"user",
	"voiceChannel",
	"warnMember"
];

test("method.ts still exposes every previous export", () => {
	expect(Object.keys(method).sort()).toEqual([...EXPECTED].sort());
	for (const name of EXPECTED) {
		expect(typeof (method as Record<string, unknown>)[name]).toBe(
			"function"
		);
	}
});
