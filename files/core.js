const eventManager = require('./core/eventManager');
const slashFetcher = require('./core/slashFetcher');
const giveawaysManager = require('./core/giveawaysManager');
const playerManager = require('./core/playerManager');
const errorManager = require('./core/errorManager');

module.exports = (client) => {
  client.commands = new Map();
  client.voiceManager = new Map();
  client.invites = new Map();
  client.interactions = new Map();
  client.register_arr = [];
  eventManager(client);
  client.commands = slashFetcher(client);
  giveawaysManager(client);
  playerManager(client);
  errorManager.uncaughtExceptionHandler(),
  api = require(__dirname+"/api/oauth.js");
};
