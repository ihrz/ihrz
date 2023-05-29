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
  name: 'snipe',
  description: 'Get the last message deleted in the channel',
  run: async (client, interaction) => {
    const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
    let data = await getLanguageData(interaction.guild.id);

    const { QuickDB } = require("quick.db");
    const db = new QuickDB();
    var based = await db.get(`${interaction.guild.id}.GUILD.SNIPE.${interaction.channel.id}`)

    if (!based) { return interaction.reply({ content: data.snipe_no_previous_message_deleted }) };

    let embed = new EmbedBuilder()
      .setColor("#474749")
      .setAuthor({ name: based.snipeUserInfoTag, iconURL: based.snipeUserInfoPp })
      .setDescription(`\`${based.snipe || 0}\``)
      .setTimestamp(based.snipeTimestamp);

      return interaction.reply({ embeds: [embed] })
  }
}