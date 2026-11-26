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

import { describe, expect, test } from "bun:test";
import { Client, Guild, MessageFlags } from "discord.js";

import enUS from "../../src/lang/en-US.ts";
import emojis from "../../src/files/emojis.json";
import {
	languageName,
	ownerWelcomePayload,
	serverWelcomePayload
} from "../../src/core/modules/guildWelcome.ts";

const client = {
	iHorizon_Emojis: emojis,
	user: {
		displayAvatarURL: () => "https://cdn.discordapp.com/avatars/1/a.png"
	},
	db: { get: async () => "fr-FR" },
	func: {
		random: { secureRandomFloat: () => 0 },
		bannerGenerator: async () => "https://www.ihorizon.org/banner-fr-FR.png"
	},
	application: {
		commands: {
			fetch: async () =>
				new Map([
					["1", { name: "setlang", id: "111" }],
					["2", { name: "help", id: "222" }]
				])
		}
	}
} as unknown as Client;
const guild = {
	id: "9",
	name: "Server one",
	iconURL: () => null
} as unknown as Guild;

describe("guild welcome", () => {
	test("the server card says the language and how to change it", async () => {
		const payload = await serverWelcomePayload(client, guild, enUS);
		expect(payload.flags).toBe(MessageFlags.IsComponentsV2);
		const json = JSON.stringify(payload.components[0].toJSON());
		expect(json).toContain("</setlang:111>");
		expect(json).toContain("</help:222>");
		expect(json).toContain("🇫🇷 Français");
		expect(json).toContain("https://dash.ihorizon.org");
		expect(json).toContain("banner-fr-FR.png");
	});

	test("the owner card names the server", async () => {
		const json = JSON.stringify(
			(
				await ownerWelcomePayload(client, guild, enUS)
			).components[0].toJSON()
		);
		expect(json).toContain("**Server one**");
		expect(json).toContain("</setlang:111>");
		expect(json).toContain("https://gitlab.com/ihrz/ihrz");
	});

	test("an unknown language reads as English", () => {
		expect(languageName("xx-XX")).toContain("English");
	});
});
