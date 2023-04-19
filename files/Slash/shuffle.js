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
const { QueryType, useQueue } = require('discord-player');

module.exports = {
  name: 'shuffle',
  description: 'Shuffle all the music queue.',
  run: async (client, interaction) => {
    const queue = useQueue(interaction.guild.id)
    if (!queue) return interaction.reply(`I am not in a voice channel`)

    if (queue.tracks.size < 2)
      return interaction.reply(
        `There aren't **enough tracks** in queue to **shuffle**`
      )

    queue.tracks.shuffle()

    return interaction.reply(`I have **shuffled** the queue`)
  }
}