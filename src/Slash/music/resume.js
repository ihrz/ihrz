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

const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
const logger = require(`${process.cwd()}/src/core/logger`);

module.exports = {
  name: 'resume',
  description: 'Resume the song if them is in pauses!',
  run: async (client, interaction, guild) => {
    let data = getLanguageData(interaction.guild.id);

    try {
      const queue = interaction.client.player.nodes.get(interaction.guild)

      if (!queue || !queue.isPlaying()) {
        return interaction.reply({ content: data.resume_nothing_playing });
      }
      const paused = queue.node.setPaused(false);
      return interaction.reply({ content: data.resume_command_work });
    } catch (error) {
      logger.err(error);
    }
  }
}
