const { MessageEmbed } = require('discord.js');
const { QueryType } = require('discord-player');

module.exports = {
    name: 'queue',
    description: '(music) Get the current queue of the guild.',
    options: [
        {
            name: 'page',
            type: 'NUMBER',
            description: '(music) go to this page of the list',
            required: false
        }
    ],
    run: async (client, interaction) => {
    var pageNumber = interaction.options.getNumber("page")
    const queue = client.player.getQueue(interaction.guild);
    if (!queue || !queue.playing) return interaction.reply({ content: '❌  - No music currently playing !' });
    if (!pageNumber) pageNumber = 1;
    const pageStart = 10 * (pageNumber - 1);
    const pageEnd = pageStart + 10;
    const currentTrack = queue.current;
    const tracks = queue.tracks.slice(pageStart, pageEnd).map((m, i) => {
        return `${i + pageStart + 1}. **${m.title}** ([link](${m.url}))`;
    });
        
    embeds = new MessageEmbed()
    .setDescription( `${tracks.join('\n')}${
        queue.tracks.length > pageEnd
            ? `\n...${queue.tracks.length - pageEnd} more track(s)`
            : ''
    }`)
    .setColor("BLUE")
    .addFields([{ name: 'Now Playing', value: `🎶 | **${currentTrack.title}** ([link](${currentTrack.url}))` }])
    .setFooter(`📄 Page: [${pageNumber}]`)
    return interaction.reply({embeds: [embeds]})

}}