const Discord = require('discord.js')
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const { 
  Client, 
  Intents, 
  Collection, 
  EmbedBuilder,
  Permissions, 
  ApplicationCommandType, 
  PermissionsBitField, 
  ApplicationCommandOptionType 
} = require('discord.js');

module.exports = {
  name: 'setup',
  description: 'Setup the bot, create a bot\'s logs channels',
  run: async (client, interaction) => {

    if(!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply(":x: | You must be an administrator of this server !");
    let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
    if(!logchannel) {
      interaction.guild.channels.create("ihorizon-logs", {
          type: "text",
          permissionOverwrites: [
             {
               id: interaction.guild.roles.everyone,
               deny: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'] 
         }
          ],
        })
        interaction.reply({content: "✅ | Channels Setup"})
      }else {return interaction.reply({content: "The bot has already setup the logs channels ! Or the bot doesn't have permission..."})}

    const filter = (interaction) => interaction.user.id === interaction.member.id;
    }}