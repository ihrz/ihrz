const eventManager = require('./core/eventManager'), playerManager = require('./core/playerManager'),
    giveawaysManager = require("./core/giveawayManager"),
    errorManager = require('./core/errorManager'), slashFetcher = require('./core/slashFetcher'),
    bash = require('./bash/bash'), DataBaseModel = require(`${process.cwd()}/files/ihorizon-api/main`);

module.exports = async (client) => {
    api = require(__dirname + "/api/oauth.js");

    client.commands = new Map(), client.voiceManager = new Map(),
        client.invites = new Map(), client.interactions = new Map(), client.register_arr = [];

    eventManager(client), playerManager(client), bash(client), giveawaysManager(client);
    slashFetcher(client, async (callback) => {
        await DataBaseModel({id: DataBaseModel.Get, key: 'BOT.CONTENT', values: callback});
    });

    errorManager.uncaughtExceptionHandler();
};