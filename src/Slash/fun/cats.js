const superagent = require('superagent');
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

const logger = require(`${process.cwd()}/src/core/logger`);

module.exports = {
  name: 'cats',
  description: 'cute cats',
  run: async (client, interaction) => {
    const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
    let data = await getLanguageData(interaction.guild.id);

    superagent
      .get('http://edgecats.net/random')
      .end((err, res) => {
        if (err) {
          logger.err(err);
          interaction.reply('Erreur lors de la récupération de l\'image du chat.');
          return;
        } else {
          const emb = new EmbedBuilder()
            .setImage(res.text)
            .setTitle(data.cats_embed_title)
            .setTimestamp();

          interaction.reply({ embeds: [emb] });
        }
      });

  }
}