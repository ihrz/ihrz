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
	Collection,
	type Guild,
	type GuildMember,
	type VoiceChannel
} from "discord.js";

import { enableTalkMode } from "../../src/core/modules/voiceModes.ts";
import type { LanguageData } from "../../types/languageData.js";

function voiceMember(id: string, serverMute: boolean, calls: string[]) {
	return {
		id,
		user: { bot: false, toString: () => `<@${id}>` },
		permissions: { has: () => false },
		voice: {
			serverMute,
			setMute: async (mute: boolean) => {
				calls.push(`${id}:${mute}`);
			}
		}
	};
}

test("talk mode leaves a member already muted by a moderator as they were", async () => {
	const store = new Map<string, unknown>();
	const calls: string[] = [];
	const guild = {
		id: "g",
		channels: { cache: new Map() },
		client: {
			db: {
				get: async (key: string) => store.get(key) ?? null,
				set: async (key: string, value: unknown) => {
					store.set(key, value);
				}
			},
			func: { ihorizon_logs: async () => {} }
		}
	} as unknown as Guild;
	const members = new Collection<string, ReturnType<typeof voiceMember>>([
		["host", voiceMember("host", false, calls)],
		["a", voiceMember("a", false, calls)],
		["muted", voiceMember("muted", true, calls)]
	]);
	const channel = {
		id: "vc",
		members,
		toString: () => "<#vc>"
	} as unknown as VoiceChannel;
	const lang = {
		util_talk_audit_reason: "talk",
		util_talk_logs_title: "t",
		util_talk_logs_description: "d"
	} as unknown as LanguageData;

	const result = await enableTalkMode(
		guild,
		channel,
		members.get("host") as unknown as GuildMember,
		lang
	);

	expect(result).toEqual({ ok: true, mutedCount: 1, skippedCount: 1 });
	expect(calls).toEqual(["a:true"]);
	expect(store.has("g.UTILS.VOICE_TALK_MUTED.a")).toBe(true);
	// Not recorded: leaving the channel must not lift the moderator mute.
	expect(store.has("g.UTILS.VOICE_TALK_MUTED.muted")).toBe(false);
	expect(store.get("g.UTILS.VOICE_TALK")).toMatchObject({
		channelId: "vc",
		enabledBy: "host"
	});
});
