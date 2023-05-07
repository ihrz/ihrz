/*Made by Kisakay*/
const { Client } = require('discord.js');
const clientIntents = require('./files/core/clientIntents.js');
const clientPartial = require('./files/core/clientPartial.js');

const client = new Client({ intents: clientIntents, partials: clientPartial, ws: { properties: { browser: 'Discord iOS' } } });
const core = require('./files/core')(client);

client.login(require('./files/config.json').token)