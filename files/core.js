const eventManager = require('./core/eventManager');
const giveawaysManager = require('./core/giveawaysManager');
const playerManager = require('./core/playerManager');
const errorManager = require('./core/errorManager');
const slashFetcher = require('./core/slashFetcher');
const bash = require('./bash/bash');
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = async (client) => {
  api = require(__dirname+"/api/oauth.js");

  client.commands = new Map();
  client.voiceManager = new Map();
  client.invites = new Map();
  client.interactions = new Map();
  client.register_arr = [];

  eventManager(client);
  giveawaysManager(client);
  playerManager(client);
  bash(client);
  slashFetcher(client, async (callback) => { 
    if(await db.get("BOT.CONTENT") !== callback) {
      await db.set("BOT.CONTENT", callback);
  }; });

  errorManager.uncaughtExceptionHandler();
};