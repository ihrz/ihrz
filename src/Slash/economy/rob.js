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

module.exports = {
  name: 'rob',
  description: 'rob user money',
  options: [
    {
      name: 'member',
      type: ApplicationCommandOptionType.User,
      description: 'the member you want to rob a money',
      required: true
    }
  ],
  run: async (client, interaction) => {
    const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
    let data = getLanguageData(interaction.guild.id);
    
    const talkedRecentlyforr = new Set();

    if (talkedRecentlyforr.has(interaction.user.id)) {
      return interaction.reply({ content: data.rob_cooldown_error });
    }

    let user = interaction.options.getMember("member");
    let targetuser = await db.get(`${interaction.guild.id}.USER.${user.id}.ECONOMY.money`)
    let author = await db.get(`${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.money`)
    if (author < 250) {
      return interaction.reply({ content: data.rob_dont_enought_error })
    }

    if (targetuser < 250) {
      return interaction.reply({
        content: data.rob_him_dont_enought_error
          .replace(/\${user\.user\.username}/g, user.user.username)
      })
    }
    let random = Math.floor(Math.random() * 200) + 1;

    let embed = new EmbedBuilder()
      .setDescription(data.rob_embed_description
        .replace(/\${interaction\.user\.id}/g, interaction.user.id)   
        .replace(/\${user\.id}/g, user.id)   
        .replace(/\${random}/g, random)   
        )
      .setColor("#a4cb80")
      .setTimestamp()
    interaction.reply({ embeds: [embed] })

    await db.sub(`${interaction.guild.id}.USER.${user.user.id}.ECONOMY.money`, random)
    await db.add(`${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.money`, random)

    talkedRecentlyforr.add(interaction.user.id);
    setTimeout(() => {
      talkedRecentlyforr.delete(interaction.user.id);
    }, 3000000);
  }
}