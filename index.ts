/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)
・ Contribution by Naya (https://github.com/belugafr)
・ Copyright © 2020-2023 iHorizon
*/

import couleurmdr from 'colors';
import logger from './src/core/logger';
import { ShardingManager } from 'discord.js';
import config from './src/files/config';

let manager = new ShardingManager('./dist/src/core/bot.js', { totalShards: "auto", token: config.discord.token });
manager.on("shardCreate", (shard) => logger.log(couleurmdr.green(`${config.console.emojis.HOST} >> The Shard number ${shard.id} is launched !`)));
manager.spawn();