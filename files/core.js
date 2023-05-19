const eventManager = require('./core/eventManager'), giveawaysManager = require('./core/giveawaysManager'), playerManager = require('./core/playerManager'),
errorManager = require('./core/errorManager'), slashFetcher = require('./core/slashFetcher'), bash = require('./bash/bash'), { QuickDB } = require("quick.db"), db = new QuickDB();

module.exports = async (client) => {
  api = require(__dirname+"/api/oauth.js");

  client.commands = new Map(), client.voiceManager = new Map(), 
  client.invites = new Map(), client.interactions = new Map(), client.register_arr = [];

  eventManager(client); giveawaysManager(client); playerManager(client); bash(client); 
  slashFetcher(client, async (callback) => {  await db.set("BOT.CONTENT", callback); });

  errorManager.uncaughtExceptionHandler();
};