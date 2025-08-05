/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import { Client, Partials, GatewayIntentBits } from 'discord.js';
import { initializeDatabase } from './database';

import * as ClientVersion from "../version.js";
import * as core from './core.js';

import config from "../files/config.js";
import { configDotenv } from 'dotenv';
import { setMaxListeners } from 'events';
configDotenv({ debug: false, quiet: true })
setMaxListeners(0)

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
	],
	enforceNonce: true
}); global.client = client;

client.version = ClientVersion
client.config = config;
client.db = await initializeDatabase(config.database);
client.inShard = function (guildId: string): boolean {
	const shardId = client.shard?.ids?.[0] ?? 0;
	const totalShards = client.options.shardCount ?? 1;

	const guildShard = Number((BigInt(guildId) >> 22n) % BigInt(totalShards));
	return guildShard === shardId;
}
core.main(client);