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

const yaml = require('js-yaml')
const fs = require('fs');

module.exports = {
  name: 'stop',
  description: '(music) Stop the music.',
  run: async (client, interaction) => {
    let fileContents = fs.readFileSync(process.cwd()+"/files/lang/en-US.yml", 'utf-8');
    let data = yaml.load(fileContents)

    try {
      const queue = interaction.client.player.nodes.get(interaction.guild)

      if (!queue || !queue.isPlaying()) {
        return interaction.reply({ content: data.stop_nothing_playing, ephemeral: true })
      }

      interaction.client.player.nodes.delete(interaction.guild?.id);
      await interaction.reply({ content: data.stop_command_work })
    } catch (error) {
      console.log(error)
    }
  }
}