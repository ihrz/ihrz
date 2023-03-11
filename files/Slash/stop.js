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
    if (!interaction.member.voice.channel) return interaction.reply(`⚠️ - You're not in a voice channel !`);
    if (interaction.guild.me.voice.channel && interaction.member.voice.channel.id !== interaction.guild.me.voice.channel.id) return interaction.reply(`⚠️ - You are not in the same voice channel !`);
    const queue = client.player.getQueue(interaction.guild)
    if (queue.destroyed) return interaction.reply(`⚠️ - Cannot go further because the queue is destroyed" !`);
    if (!queue || !queue.playing) return interaction.reply({ content: '❌  - No music currently playing !' });
    queue.clear()
    queue.destroy()
  return interaction.reply({ content: `✅ - Music **stopped** into this server !` });
}}