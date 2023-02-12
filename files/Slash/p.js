const { MessageEmbed } = require('discord.js');
const { QueryType } = require('discord-player');

module.exports = {
    name: 'p',
    description: '(music) play a music',
    options: [
        {
            name: 'title',
            type: 'STRING',
            description: 'The track title you want (you can put URL as you want)',
            required: true
        }
    ],
    run: async (client, interaction) => {
  
        const filter = (interaction) => interaction.user.id === interaction.member.id;
         const guild = client.guilds.cache.get(interaction.member.guild.id);
         const channel = guild.channels.cache.get(interaction.channelId);
         const query = interaction.options.getString("title")
         const searchResult = await client.player
             .search(query, {
                 requestedBy: interaction.member,
                 searchEngine: QueryType.AUTO
             })
             .catch(() => {
                 console.log('he');
             });
         if (!searchResult || !searchResult.tracks.length) return interaction.reply({ content: "No results were found!" });
        
         const queue = await client.player.createQueue(interaction.member.guild, {
             ytdlOptions: {
                 filter: 'audioonly',
                 highWaterMark: 1 << 30,
                 dlChunkSize: 0,
             },
             metadata: channel
         });
        /*const member = guild.members.cache.get(message.author.id) ?? await guild.members.fetch(message.author.id);*/
         const member = guild.members.cache.get(interaction.member.id) ?? await guild.members.fetch(interaction.member.id);
         try {
             if (!queue.connection) await queue.connect(member.voice.channel);
         } catch {
             void client.player.deleteQueue(interaction.member.guild);
             return await interaction.reply({ content: 'Could not join your voice channel!' });
         }
        
         await interaction.reply({ content: `⏱ | Loading your ${searchResult.playlist ? 'playlist' : 'track'}...` });
         searchResult.playlist ? queue.addTracks(searchResult.tracks) : queue.addTrack(searchResult.tracks[0]);
         if (!queue.playing) await queue.play();
            
}}