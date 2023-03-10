const { MessageEmbed } = require('discord.js');
const { QueueRepeatMode } = require('discord-player');
module.exports = {
  name: 'loop',
  description: '(music) Set loop mode of the guild',
  options: [
      {
          name: 'mode',
          type: "INTEGER",
          description: 'Loop Type',
          required: true,
          choices: [
              {
                  name: 'Off',
                  value: QueueRepeatMode.OFF
              },
              {
                  name: 'On',
                  value: QueueRepeatMode.TRACK
              }
          ]
      }
  ],
    run: async (client, interaction) => {
      const loopMode = interaction.options.getInteger("mode");
      var yeaboi
      if (!interaction.member.voice.channel) return interaction.reply(`⚠️ - You're not in a voice channel !`);
     if (interaction.guild.me.voice.channel && interaction.member.voice.channel.id !== interaction.guild.me.voice.channel.id) return interaction.reply(`⚠️ - You are not in the same voice channel !`);
     if(loopMode == 1) { var yeaboi = "enabled"}else{ if(loopMode == 0) var yeaboi = "disabled"}
        const embed = new MessageEmbed()
      .setTitle(`🎵 Loop mode ${yeaboi} !`)
      .setColor("BLUE")
      .setDescription('▶ | The loop mod has been changed ! !')
    const filter = (interaction) => interaction.user.id === interaction.member.id;
    const queue = client.player.getQueue(interaction.member.guild);
    if (!queue || !queue.playing) return await interaction.reply({ content: '❌ | No music is playing at the moment!' });
    queue.setRepeatMode(loopMode);
    await interaction.reply({ embeds: [embed] });
    }}
