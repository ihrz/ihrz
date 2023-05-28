const Discord = require('discord.js')
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const {
  Client,
  Intents,
  Collection,
  EmbedBuilder,
  Permissions,
  ChannelType,
  ApplicationCommandType,
  PermissionsBitField,
  PermissionFlagsBits,
  ApplicationCommandOptionType
} = require('discord.js');

module.exports = {
  name: 'setup',
  description: 'Setup the bot, create a bot\'s logs channels',
  run: async (client, interaction) => {
    const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
    let data = getLanguageData(interaction.guild.id);

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)){
      return interaction.reply(data.setup_not_admin);
    } 
    let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
    if (!logchannel) {
      interaction.guild.channels.create({
        name: 'ihorizon-logs',
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: interaction.guild.roles.everyone,
            deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
          }
        ],
      })
      interaction.reply({ content: data.setup_command_work })
    } else { return interaction.reply({ content: data.setup_command_error }) }
  }
}