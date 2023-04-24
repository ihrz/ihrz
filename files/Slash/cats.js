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

const yaml = require('js-yaml'), fs = require('fs');

module.exports = {
  name: 'cats',
  description: 'cute cats',
  run: async (client, interaction) => {
    let fileContents = fs.readFileSync(process.cwd()+"/files/lang/en-US.yml", 'utf-8'); //
    let data = yaml.load(fileContents)

    request('http://edgecats.net/random', function (error, response, body) {
      if (!error && response.statusCode == 200) {
        let emb = new EmbedBuilder()
          .setImage(body)
          .setTitle(data.cats_embed_title)
          .setTimestamp()

        interaction.reply({ embeds: [emb] })
      }
    });
  }
}