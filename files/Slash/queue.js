const { useQueue } = require('discord-player')

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

module.exports = {
   name: 'queue',
   description: 'Get the music queue',
   run: async (client, interaction) => {
    const queue = useQueue(interaction.guildId)

    if (!queue)
      return interaction.reply('I am not in a voice channel', {
        ephemeral: false,
      })
    if (!queue.tracks || !queue.currentTrack)
      return interaction.reply('There is no queue', { ephemeral: false })

    const tracks = queue.tracks
      .toArray()
      .map((track, idx) => `**${++idx})** [${track.title}](${track.url})`)

    const embeds = []
    const chunkSize = 10
    let index = 0
    while (tracks.length > 0) {
      const chunk = tracks.slice(0, chunkSize)
      const embed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('Tracks Queue')
        .setDescription(chunk.join('\n') || '**No more queued songs**')
        .setFooter({
          text: `Page ${index + 1} | Total ${queue.tracks.size} tracks`,
        })

      embeds.push(embed)
      tracks.splice(0, chunkSize)
      index++
    }

    const message = await interaction.reply({
      embeds: [embeds[0]],
      fetchReply: true,
    })

    if (embeds.length === 1) return

    message.react('⬅️')
    message.react('➡️')

    const collector = message.createReactionCollector({
      filter: (reaction, user) =>
        ['⬅️', '➡️'].includes(reaction.emoji.name) &&
        user.id === interaction.user.id,
      time: 60000,
    })

    let currentIndex = 0
    collector.on('collect', (reaction, user) => {
      switch (reaction.emoji.name) {
        case '⬅️':
          if (currentIndex === 0) return
          currentIndex--
          break
        case '➡️':
          if (currentIndex === embeds.length - 1) return
          currentIndex++
          break
        default:
          break
      }

      reaction.users.remove(user.id).catch(() => {})

      message.edit({ embeds: [embeds[currentIndex]] })
    })

    collector.on('end', () => {
      message.reactions.removeAll().catch(() => {})
    })
  },
}