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

module.exports = {
  name: 'resume',
  description: 'Resume the song if them is in pauses!',
  run: async (client, interaction, guild) => {
    try{
      const queue = interaction.client.player.nodes.get(interaction.guild)

      if (!queue || !queue.isPlaying()) {
          return interaction.reply("There is nothing playing")
      }

      const paused = queue.node.setPaused(false)
      return interaction.reply("resumed successfully")
  }catch (error) {
      console.log(error)
  }
    }}
