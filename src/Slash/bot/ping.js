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

const fs = require('fs');
const ping = require("ping");
const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);

module.exports = {
  name: 'ping',
  description: 'Pong in ms xd',
  run: async (client, interaction) => {
    let data = await getLanguageData(interaction.guild.id);
    
    await interaction.reply(':ping_pong:')

    let network = ''
    network = await ping.promise.probe("192.168.0.254").then(result => network = result.time).catch(e => { network = "**DOWN**"});

    let API = ''
    API = await ping.promise.probe("discord.com").then(result => API = result.time).catch(e => { API = "**DOWN**"});

    let embed = new EmbedBuilder()
    .setColor("#319938")
    .setTitle("Pong! 🏓")
    .setDescription(`**Network** : \`${await network}\` ms\n**Discord API** : \`${await API}\` ms`)

    interaction.editReply({content: '', embeds: [embed]})
  }
};