const { ShardingManager } = require('discord.js');
logger = require(`${process.cwd()}/src/core/logger`);
manager = new ShardingManager("./src/core/bot.js", { totalShards: "auto", token: require(`${process.cwd()}/files/config`).discord.token});
colors = require("colors");
manager.on("shardCreate", (shard) => logger.log(`${require(`${process.cwd()}/files/config`).console.emojis.HOST} >> Shard[${shard.id}] launched !`.green));
manager.spawn();