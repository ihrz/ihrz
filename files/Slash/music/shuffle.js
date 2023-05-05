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
const { QueryType, useQueue } = require('discord-player');

const yaml = require('js-yaml'), fs = require('fs');
const getLanguage = require(`${process.cwd()}/files/lang/getLanguage`);

module.exports = {
  name: 'shuffle',
  description: 'Shuffle all the music queue.',
  run: async (client, interaction) => {
    let fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
    let data = yaml.load(fileContents);

    const queue = useQueue(interaction.guild.id)
    if (!queue) return interaction.reply({ content: data.shuffle_no_queue })

    if (queue.tracks.size < 2) return interaction.reply({ content: data.shuffle_no_enought });
    queue.tracks.shuffle()

    return interaction.reply({ content: data.shuffle_command_work })
  }
}