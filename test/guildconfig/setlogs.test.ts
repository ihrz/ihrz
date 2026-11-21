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
import {
	GuildBasedChannel,
	PermissionFlagsBits,
	PermissionsBitField,
	User
} from "discord.js";

import { missingLogPermissions } from "../../src/Interaction/HybridCommands/guildconfig/setlogschannel.ts";

const bot = { id: "1" } as User;

function channelWith(permissions: bigint[] | null): GuildBasedChannel {
	return {
		permissionsFor: () =>
			permissions ? new PermissionsBitField(permissions) : null
	} as unknown as GuildBasedChannel;
}

describe("missingLogPermissions", () => {
	test("nothing is missing when the bot can post embeds", () => {
		const channel = channelWith([
			PermissionFlagsBits.ViewChannel,
			PermissionFlagsBits.SendMessages,
			PermissionFlagsBits.EmbedLinks
		]);
		expect(missingLogPermissions(channel, bot)).toEqual([]);
	});

	test("an administrator bot misses nothing", () => {
		const channel = channelWith([PermissionFlagsBits.Administrator]);
		expect(missingLogPermissions(channel, bot)).toEqual([]);
	});

	test("lists what the bot lacks in the channel", () => {
		const channel = channelWith([PermissionFlagsBits.ViewChannel]);
		expect(missingLogPermissions(channel, bot)).toEqual([
			"SendMessages",
			"EmbedLinks"
		]);
	});

	test("an unknown channel misses every log permission", () => {
		const all = ["ViewChannel", "SendMessages", "EmbedLinks"];
		expect(missingLogPermissions(undefined, bot)).toEqual(all);
		expect(missingLogPermissions(channelWith(null), bot)).toEqual(all);
	});
});
