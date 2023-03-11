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
    name: 'skip',
    description: '(music) Skip the current music played.',
    run: async (client, interaction) => {
        if (!interaction.member.voice.channel) return interaction.reply(`⚠️ - You're not in a voice channel !`);
        if (interaction.guild.me.voice.channel && interaction.member.voice.channel.id !== interaction.guild.me.voice.channel.id) return interaction.reply(`⚠️ - You are not in the same voice channel !`);
                
            const queue = client.player.getQueue(interaction.guild);
            if (!queue || !queue.playing) return interaction.reply({ content: '❌ - No music currently playing !' });
            const currentTrack = queue.current;
            const success = queue.skip();
            return interaction.reply({content:`✅ - The current music has just been **skipped** !`});
}}