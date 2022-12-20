const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');

    module.exports = {
        name: 'pause',
        description: '(music) freeze the music',
        run: async (client, interaction) => {
            if (!interaction.member.voice.channel) return interaction.reply(`⚠️ - You're not in a voice channel !`);
            if (interaction.guild.me.voice.channel && interaction.member.voice.channel.id !== interaction.guild.me.voice.channel.id) return interaction.reply(`⚠️ - You are not in the same voice channel !`);        
            const embed = new MessageEmbed()
            .setTitle(`🎶 - Current Song is **paused** !`)
            .setColor("BLUE")
          
          const queue = client.player.getQueue(interaction.member.guild);
          if (!queue || !queue.playing) return await interaction.reply({ embeds: [embed] });({ content: '❌ | No music is playing at this time!' });
          const paused = queue.setPaused(true);
          return await interaction.reply({ embeds: [embed] });

          const filter = (interaction) => interaction.user.id === interaction.member.id;
          }}
      