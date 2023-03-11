
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
const { QueueRepeatMode } = require('discord-player');
module.exports = {
  name: 'loop',
  description: '(music) Set loop mode of the guild',
  options: [
      {
          name: 'mode',
          type: ApplicationCommandOptionType.Integer,
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
      /*
      const loopMode = interaction.options.getInteger("mode");
      var yeaboi
      if (!interaction.member.voice.channel) return interaction.reply(`⚠️ - You're not in a voice channel !`);
     if (interaction.guild.me.voice.channel && interaction.member.voice.channel.id !== interaction.guild.me.voice.channel.id) return interaction.reply(`⚠️ - You are not in the same voice channel !`);
     if(loopMode == 1) { var yeaboi = "enabled"}else{ if(loopMode == 0) var yeaboi = "disabled"}
        const embed = new EmbedBuilder()
      .setTitle(`🎵 Loop mode ${yeaboi} !`)
      .setColor("#016c9a")
      .setDescription('▶ | The loop mod has been changed ! !')
    const filter = (interaction) => interaction.user.id === interaction.member.id;
    const queue = client.player.getQueue(interaction.member.guild);
    if (!queue || !queue.playing) return await interaction.reply({ content: '❌ | No music is playing at the moment!' });
    queue.setRepeatMode(loopMode);*/

       try {

        const queue = interaction.client.player.nodes.get(interaction.guild)

        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ content: "There is no queue!" })
        }

        const loopMode = interaction.options.getNumber("select")

        queue.setRepeatMode(loopMode)
        const mode = loopMode === QueueRepeatMode.TRACK ? `🔂` : loopMode === QueueRepeatMode.QUEUE ? `🔂` : `▶`
        return interaction.reply({ content: `${mode} | Updated loop mode` })
    }catch (error) {
        console.log(error)
    }
    await interaction.reply({ embeds: [embed] });
    }}
