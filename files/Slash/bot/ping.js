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
const getLanguage = require(`${process.cwd()}/files/lang/getLanguage`);

const host = "discord.com";

module.exports = {
  name: 'ping',
  description: 'Pong in ms xd',
  run: async (client, interaction) => {
    let debut = Date.now();
    let fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
    let data = yaml.load(fileContents);

    await interaction.reply(':ping_pong:')
    
    await ping.promise.probe(host)
    .then((result) => { interaction.editReply(data.pong_message+`\ ${result.time}ms`);})
    .catch((error) => {});
  }
}