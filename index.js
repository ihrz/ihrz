const { ShardingManager } = require("discord.js"); const logger = require(`${process.cwd()}/files/core/logger`);
const manager = new ShardingManager("./files/core/bot.js", { totalShards: "auto", token: require('./files/config').discord.token});
manager.on("shardCreate", (shard) => logger.log(`Shard [${shard.id}] launched !`)); manager.spawn();