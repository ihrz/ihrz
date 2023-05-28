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

const yaml = require('js-yaml');
const fs = require('fs');
const ping = require("ping");
const getLanguage = require(`${process.cwd()}/src/lang/getLanguage`);

module.exports = {
  name: 'ping',
  description: 'Pong in ms xd',
  run: async (client, interaction) => {
    let fileContents = fs.readFileSync(`${process.cwd()}/src/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
    let data = yaml.load(fileContents);

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