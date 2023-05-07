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
const getLanguage = require(`${process.cwd()}/files/lang/getLanguage`);
const logger = require(`${process.cwd()}/files/core/logger`);

module.exports = {
  name: 'resume',
  description: 'Resume the song if them is in pauses!',
  run: async (client, interaction, guild) => {
    let fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
    let data = yaml.load(fileContents);

    try {
      const queue = interaction.client.player.nodes.get(interaction.guild)

      if (!queue || !queue.isPlaying()) {
        return interaction.reply({ content: data.resume_nothing_playing });
      }

      const paused = queue.node.setPaused(false)
      return interaction.reply({ content: data.resume_command_work });
    } catch (error) {
      logger.err(error)
    }
  }
}
