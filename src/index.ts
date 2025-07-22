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

import { execSync } from 'child_process';

execSync("git pull", {
	stdio: [0, 1, 2],
	cwd: process.cwd()
});

import './core/functions/colors.js';

import getToken from './core/functions/getToken.js';
import logger from './core/logger.js';

import { ShardingManager } from 'discord.js';
import config from './files/config.js';
import { config as conf } from 'dotenv';
conf();

const _token = await getToken();

logger.legacy("[*] iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz).".gray);
logger.legacy("[*] Warning: iHorizon Discord bot is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International".gray);
logger.legacy("[*] Please respect the terms of this license. Learn more at: https://creativecommons.org/licenses/by-nc-sa/4.0".gray);

const manager = new ShardingManager('./src/core/bot.ts', { totalShards: "auto", token: _token || process.env.BOT_TOKEN || config.discord.token });
manager.on("shardCreate", (shard) => logger.log(`${config.console.emojis.HOST} >> The Shard number ${shard.id} is now launched :) !`.green));
manager.spawn();