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

const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);

module.exports = {
  name: 'shuffle',
  description: 'Shuffle all the music queue.',
  run: async (client, interaction) => {
    let data = getLanguageData(interaction.guild.id);
    const queue = useQueue(interaction.guild.id);
    if (!queue) return interaction.reply({ content: data.shuffle_no_queue });
    if (queue.tracks.size < 2) return interaction.reply({ content: data.shuffle_no_enought });
    queue.tracks.shuffle();
    interaction.reply({ content: data.shuffle_command_work });
    return;
  }
}