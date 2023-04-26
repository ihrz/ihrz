const { QuickDB } = require("quick.db");
const db = new QuickDB();
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
  name: 'work',
  description: 'Work and earn money into your bank',
  run: async (client, interaction) => {
    let fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
    let data = yaml.load(fileContents);
    const talkedRecentlyforw = new Set();

    if (talkedRecentlyforw.has(interaction.user.id)) {
      return message.channel.send(data.work_cooldown_error);
    }

    let amount = Math.floor(Math.random() * 200) + 1;

    let embed = new EmbedBuilder()
      .setAuthor({ name: data.work_embed_author
        .replace(/\${interaction\.user\.username}/g, interaction.user.username)
        .replace(/\${interaction\.user\.discriminator}/g, interaction.user.discriminator)

        , iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png` })
      .setDescription(data.work_embed_description
        .replace(/\${interaction\.user\.username}/g, interaction.user.username)
        .replace(/\${interaction\.user\.discriminator}/g, interaction.user.discriminator)
        .replace(/\${amount}/g, amount)
        )
      .setColor("#f1d488")

    interaction.reply({ embeds: [embed] })
    await db.add(`${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.money`, amount)

    talkedRecentlyforw.add(interaction.user.id);
    setTimeout(() => {
      talkedRecentlyforw.delete(interaction.user.id);
    }, 3600000);

    const filter = (interaction) => interaction.user.id === interaction.member.id;
  }
}
