/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2023 iHorizon
*/

const eventManager = require('./core/eventManager'),
    playerManager = require('./core/playerManager'),
    giveawaysManager = require("./core/giveawayManager"),
    errorManager = require('./core/errorManager'),
    slashFetcher = require('./core/slashFetcher'),
    bash = require('./bash/bash'),
    DataBaseModel = require(`${process.cwd()}/files/ihorizon-api/main`);

module.exports = async (client) => {
    api = require(__dirname + "/api/oauth.js");

    client.commands = new Map(), 
    client.voiceManager = new Map(),
    client.invites = new Map(), 
    client.interactions = new Map(), 
    client.register_arr = [];

    eventManager(client), 
    playerManager(client), 
    bash(client), 
    giveawaysManager(client);

    slashFetcher(client, async (callback) => {
        await DataBaseModel({ id: DataBaseModel.Set, key: 'BOT.CONTENT', values: callback });
    });
    
    errorManager.uncaughtExceptionHandler();
};