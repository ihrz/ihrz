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

      /*
    if (!message.member.voice.channel) return message.channel.send(`🛑 - You're not in a voice channel !`);
    if (message.guild.me.voice.channel && message.member.voice.channel.id !== message.guild.me.voice.channel.id) return message.channel.send(`🛑 - You are not in the same voice channel !`);
    */


   
    module.exports = {
        name: 'nowplaying',
        description: '(music) see the current music played',
        run: async (client, interaction) => {
      
            const queue = client.player.getQueue(interaction.member.guild);
           // if (!queue || !queue.playing) return await interaction.reply({ content: '❌ | No music is playing at the moment!'});
            const progress = queue.createProgressBar();
            const perc = queue.getPlayerTimestamp();
                let embed = new EmbedBuilder()
                .setColor("#016c9a")
                .setDescription(`🎵 | **${queue.current.title}**! (\`${perc.progress == 'Infinity' ? 'DIRECT' : perc.progress + '%'}\`)`)
                .addFields(
                    {
                        name: 'Song Duration',
                        value: progress.replace(/ 0:00/g, ' ◉ LIVE')
                    })      
          const filter = (interaction) => interaction.user.id === interaction.member.id;
          return await interaction.reply({ embeds: [embed] });
        }}
      