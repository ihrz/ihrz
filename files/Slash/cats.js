const request = require('request');
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
  name: 'cats',
  description: 'cute cats',
  run: async (client, interaction) => {

    request('http://edgecats.net/random', function (error, response, body) {
      if (!error && response.statusCode == 200) {
        let emb = new EmbedBuilder()
          .setImage(body)
          .setTitle('Miauw :cat:')
          .setTimestamp()

        interaction.reply({ embeds: [emb] })
      }
    });
    const filter = (interaction) => interaction.user.id === interaction.member.id;
  }
}