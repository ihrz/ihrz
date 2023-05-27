const { ShardingManager } = require("discord.js");
logger = require(`${process.cwd()}/files/core/logger`);
manager = new ShardingManager("./files/core/bot.js", { totalShards: "auto", token: require('./files/config').discord.token});
colors = require("colors");
manager.on("shardCreate", (shard) => logger.log(`【${require(`${process.cwd()}/files/config`).console.emojis.HOST}】 >> Shard[${shard.id}] launched !`.green));
manager.spawn();