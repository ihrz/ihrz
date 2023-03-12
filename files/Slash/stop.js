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

module.exports = {
    name: 'stop',
    description: '(music) Stop the music.',
    run: async (client, interaction) => {
      try{
        const queue = interaction.client.player.nodes.get(interaction.guild)

        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ content: 'nothing playing', ephemeral: true })
        }

        interaction.client.player.nodes.delete(interaction.guild?.id);
        await interaction.reply("Queue stopped")
    }catch (error) {
        console.log(error)
    }
}}