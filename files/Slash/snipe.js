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
  name: 'snipe',
  description: 'Get the last message deleted in the channel',
  run: async (client, interaction) => {
    let fileContents = fs.readFileSync(process.cwd()+"/files/lang/en-US.yml", 'utf-8');
    let data = yaml.load(fileContents)

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