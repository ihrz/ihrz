const { Client } = require('discord.js');
const clientIntents = require('./clientIntents.js');
const clientPartial = require('./clientPartial.js');
const client = new Client({ intents: clientIntents, partials: clientPartial, ws: { properties: { browser: 'Discord iOS' } } });
const core = require('../core')(client);
client.login(require('../config.js').token);