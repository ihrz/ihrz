const { GatewayIntentBits } = require('discord.js');

const clientIntents = [
    GatewayIntentBits.AutoModerationConfiguration, 
    GatewayIntentBits.AutoModerationExecution, 
    GatewayIntentBits.DirectMessageReactions, 
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.DirectMessages, 
    GatewayIntentBits.GuildBans, 
    GatewayIntentBits.GuildEmojisAndStickers, 
    GatewayIntentBits.GuildIntegrations, 
    GatewayIntentBits.DirectMessageTyping,
    GatewayIntentBits.GuildInvites, 
    GatewayIntentBits.GuildMembers, 
    GatewayIntentBits.GuildMessageReactions, 
    GatewayIntentBits.GuildMessageTyping, 
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.GuildModeration, 
    GatewayIntentBits.GuildPresences, 
    GatewayIntentBits.GuildScheduledEvents, 
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
];

module.exports = clientIntents;
