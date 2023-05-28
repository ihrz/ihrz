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
  name: 'dogs',
  description: 'cute dogs',
  run: async (client, interaction) => {
    const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
    let data = getLanguageData(interaction.guild.id);

    superagent
      .get('dog.ceo/api/breeds/image/random')
      .end((err, res) => {
        if (err) {
        logger.err(err); interaction.reply(data.dogs_embed_command_error); return;
        } else {
          const emb = new EmbedBuilder()
            .setImage(res.body.message).setTitle(data.dogs_embed_title).setTimestamp();

          interaction.reply({ embeds: [emb] });
        }
      });
  }
}