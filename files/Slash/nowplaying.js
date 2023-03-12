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
      
            try {

                const queue = interaction.client.player.nodes.get(interaction.guild)
        
                if (!queue || !queue.isPlaying()) {
                    return interaction.reply({ content: "There is not playing anything", ephemeral: true })
                }
        
                const progress = queue.node.createProgressBar()
                const ts = queue.node.getTimestamp();
        
                const embed = new EmbedBuilder()
                    .setTitle("Now playing")
                    .setDescription(`[${queue.currentTrack.title}](${queue.currentTrack.url})`)
                    .setThumbnail(`${queue.currentTrack.thumbnail}`)
                    .addFields(
                        { name: '\200', value: progress.replace(/ 0:00/g, 'LIVE') }
                    )
        
                await interaction.reply({ embeds: [embed] })
            }catch (error) {
                console.log(error)
            }
        }}
      