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

import './core/functions/colors.js';

import config from './files/config.js';
import logger from './core/logger.js';

import { ShardingManager } from 'discord.js';
import { config as conf } from 'dotenv';

conf({ debug: false, quiet: true });

const manager = new ShardingManager('./src/core/bot.ts', {
	totalShards: process.env.TOTAL_SHARDS
		? isNaN(Number(process.env.TOTAL_SHARDS))
			? 'auto'
			: Number(process.env.TOTAL_SHARDS)
		: 'auto',
	token: process.env.BOT_TOKEN || config.discord.token
});
manager.on("shardCreate", (shard) => logger.log(`${config.console.emojis.HOST} >> The Shard number ${shard.id} is now launched :) !`.green));
manager.spawn();