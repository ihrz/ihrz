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
const { QueryType } = require('discord-player');

const logger = require(`${process.cwd()}/src/core/logger`);
const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);

module.exports = {
  name: 'stop',
  description: '(music) Stop the music.',
  run: async (client, interaction) => {
    let data = await getLanguageData(interaction.guild.id);
    try {
      const queue = interaction.client.player.nodes.get(interaction.guild);

      if (!queue || !queue.isPlaying()) {
        return interaction.reply({ content: data.stop_nothing_playing, ephemeral: true });
      }

      interaction.client.player.nodes.delete(interaction.guild?.id);
      await interaction.reply({ content: data.stop_command_work });
    } catch (error) {
      logger.error(error);
    }
  }
}