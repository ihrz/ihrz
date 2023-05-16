const { ShardingManager } = require("discord.js");
const manager = new ShardingManager("./files/core/bot.js", { totalShards: "auto", token: require('./files/config.json').token});
manager.on("shardCreate", (shard) => console.log(`Shard ${shard.id} launched`));
manager.spawn();