const eventManager = require('./core/eventManager');
const giveawaysManager = require('./core/giveawaysManager');
const playerManager = require('./core/playerManager');
const errorManager = require('./core/errorManager');
const slashFetcher = require('./core/slashFetcher');
const bash = require('./bash/core');
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = (client) => {
  slashFetcher(client, (callback) => { 
    let old_content = db.get("BOT.CONTENT");
    if(old_content != callback) {
      db.set("BOT.CONTENT", callback);
  }; });

  client.commands = new Map();
  client.voiceManager = new Map();
  client.invites = new Map();
  client.interactions = new Map();
  client.register_arr = [];
  eventManager(client);
  giveawaysManager(client);
  playerManager(client);
  errorManager.uncaughtExceptionHandler(),
  api = require(__dirname+"/api/oauth.js");
  bash(client);
};