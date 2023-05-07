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

const yaml = require('js-yaml'), fs = require('fs');
const getLanguage = require(`${process.cwd()}/files/lang/getLanguage`);
const logger = require(`${process.cwd()}/files/core/logger`);

module.exports = {
  name: 'cats',
  description: 'cute cats',
  run: async (client, interaction) => {
    let fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
    let data = yaml.load(fileContents);

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