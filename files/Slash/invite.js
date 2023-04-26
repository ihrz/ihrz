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

module.exports = {
  name: 'invite',
  description: 'I love you, show me your love for me back ! Invite me !',
  run: async (client, interaction) => {
    let fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
    let data = yaml.load(fileContents);
    
    let invites = new EmbedBuilder()
      .setColor("#416fec")
      .setTitle(data.invite_embed_title)
      .setDescription(data.invite_embed_description)
      .setURL('https://discord.com/api/oauth2/authorize?client_id=' + client.user.id + '&permissions=8&scope=bot')
      .setFooter({ text: 'iHorizon', iconURL: client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 }) })
      .setThumbnail(client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 }))
    return interaction.reply({ embeds: [invites] })
  }
}