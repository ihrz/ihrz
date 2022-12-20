const { MessageEmbed, MessageActionRow, MessageSelectMenu } = require("discord.js")

module.exports = {
  name: 'resume',
  description: 'Resume the song if them is in pauses!',
  run: async (client, interaction, guild) => {
    const embed = new MessageEmbed()
      .setTitle(`🎵 - The current song has been **resumed** !`)
      .setColor("BLUE")
    const filter = (interaction) => interaction.user.id === interaction.member.id;
    
    


    if (!interaction.member.voice.channel) return interaction.reply(`⚠️ - You're not in a voice channel !`);
    if (interaction.guild.me.voice.channel && interaction.member.voice.channel.id !== interaction.guild.me.voice.channel.id) return interaction.reply(`⚠️ - You are not in the same voice channel !`);
    const queue = client.player.getQueue(interaction.member.guild);
   
    if (!queue || !queue.playing) return interaction.reply('❌ | Aucune musique n\'est diffusé en ce moment!');
    const paused = queue.setPaused(false);
    await interaction.reply({ embeds: [embed] });
    }}
