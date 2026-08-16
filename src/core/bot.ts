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

import { Client, Partials, GatewayIntentBits, Options } from "discord.js";
import { initializeDatabase } from "./database";

import * as ClientVersion from "../version.js";
import * as core from "./core.js";

import config from "../files/config.js";
import { setMaxListeners } from "events";
import { getOS } from "./getOS.js";
import { iHorizonTimeCalculator } from "./functions/ms.js";
setMaxListeners(0);

const DISCORD_MESSAGE_SWEEP_LIFETIME_SECONDS = 60 * 60 * 8;
const DISCORD_MESSAGE_SWEEP_INTERVAL_SECONDS = 60 * 15;

global.getOS = getOS;

global.client = new Client({
	makeCache: Options.cacheWithLimits({
		MessageManager: 100,
		PresenceManager: 50
	}),
	sweepers: {
		messages: {
			interval: DISCORD_MESSAGE_SWEEP_INTERVAL_SECONDS,
			lifetime: DISCORD_MESSAGE_SWEEP_LIFETIME_SECONDS
		},
		users: {
			interval: 60 * 30,
			filter: () => (user) => !user.bot
		},
		presences: {
			interval: 60 * 15,
			filter: () => (presence) => {
				return presence.status === "offline";
			}
		},
		threads: {
			interval: 60 * 30,
			lifetime: 60 * 60
		}
	},
	intents: [
		GatewayIntentBits.AutoModerationConfiguration,
		GatewayIntentBits.AutoModerationExecution,
		GatewayIntentBits.DirectMessageReactions,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.DirectMessageTyping,
		GatewayIntentBits.GuildEmojisAndStickers,
		GatewayIntentBits.GuildIntegrations,
		GatewayIntentBits.GuildInvites,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageTyping,
		GatewayIntentBits.GuildModeration,
		GatewayIntentBits.GuildPresences,
		GatewayIntentBits.GuildScheduledEvents,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildWebhooks,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMessagePolls,
		GatewayIntentBits.DirectMessagePolls
	],
	partials: [
		Partials.Channel,
		Partials.Message,
		Partials.GuildMember,
		Partials.GuildScheduledEvent,
		Partials.User,
		Partials.Reaction,
		Partials.ThreadMember,
		Partials.Poll,
		Partials.PollAnswer,
		Partials.SoundboardSound
	],
	enforceNonce: true
});

client.timeCalculator = new iHorizonTimeCalculator();

client.inShard = function (guildId: string): boolean {
	const shardId = client.shard?.ids?.[0] ?? 0;
	const totalShards = client.options.shardCount ?? 1;
	let guildShard: number | null = null;

	try {
		guildShard = Number((BigInt(guildId) >> 22n) % BigInt(totalShards));
	} catch {
		guildShard = shardId;
	}
	return guildShard === shardId;
};
client.isMainShard = function (): boolean {
	return client.shard?.ids[0] === 0;
};

client.version = ClientVersion;
client.config = config;

const { x, y } = await initializeDatabase(config.database);
client.db = x;
if (y) client.db2 = y;

core.main(client);
