const { useQueue } = require('discord-player');
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

const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);

module.exports = {
  name: 'queue',
  description: 'Get the music queue',
  run: async (client, interaction) => {
    let data = await getLanguageData(interaction.guild.id);
    const queue = useQueue(interaction.guildId);

    if (!queue) return interaction.reply({ content: data.queue_iam_not_voicec })
    if (!queue.tracks || !queue.currentTrack) {
      return interaction.reply({ content: data.queue_no_queue })
    }

    const tracks = queue.tracks
      .toArray()
      .map((track, idx) => `**${++idx})** [${track.title}](${track.url})`)

    if (tracks.length === 0) {
      return interaction.reply({ content: data.queue_empty_queue })
    }

    const embeds = [];
    const chunkSize = 10;
    let index = 0;
    while (tracks.length > 0) {
      const chunk = tracks.slice(0, chunkSize);
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle(data.queue_embed_title)
        .setDescription(chunk.join('\n') || data.queue_embed_description_empty)
        .setFooter({ text: data.queue_embed_footer_text
          .replace("{index}", index + 1)
          .replace("{track}", queue.tracks.size)
        });

      embeds.push(embed);
      tracks.splice(0, chunkSize);
      index++;
    }

    const message = await interaction.reply({
      embeds: [embeds[0]],
      fetchReply: true
    })

    if (embeds.length === 1) return

    message.react('⬅️');
    message.react('➡️');

    const collector = message.createReactionCollector({
      filter: (reaction, user) =>
        ['⬅️', '➡️'].includes(reaction.emoji.name) &&
        user.id === interaction.user.id,
      time: 60000
    });

    let currentIndex = 0;
    collector.on('collect', (reaction, user) => {
      switch (reaction.emoji.name) {
        case '⬅️':
          if (currentIndex === 0) return
          currentIndex--;
          break;
        case '➡️':
          if (currentIndex === embeds.length - 1) return
          currentIndex++;
          break;
        default:
          break;
      }

      reaction.users.remove(user.id).catch(() => { });

      message.edit({ embeds: [embeds[currentIndex]] });
    })

    collector.on('end', () => {
      message.reactions.removeAll().catch(() => { });
    });
  },
}