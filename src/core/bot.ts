/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

if (process.env.CACHE === "true") {
	// @ts-ignore
	global.cache = await import("../../handlerCache.js");;
}

import { Client, Partials, GatewayIntentBits } from 'discord.js';
import { initializeDatabase } from './database.js';

import * as ClientVersion from "../version.js";
import * as core from './core.js';

import config from "../files/config.js";

const client = new Client({
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
		Partials.ThreadMember
	]
})

client.db = await initializeDatabase(config);
client.version = ClientVersion
client.config = config;
core.main(client);