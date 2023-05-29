const {
  Client,
  Intents,
  Collection,
  ChannelType,
  EmbedBuilder,
  Permissions,
  ApplicationCommandType,
  PermissionsBitField,
  ApplicationCommandOptionType
} = require('discord.js');

const { QuickDB } = require("quick.db");
const db = new QuickDB();
const ms = require("ms");

const yaml = require('js-yaml')
const fs = require('fs');

module.exports = {
  name: 'report',
  description: 'report a bug or spelling mistake...',
  options: [
    {
      name: 'message-to-dev',
      type: ApplicationCommandOptionType.String,
      description: 'What is the problem? Please make a good sentences',
      required: true
    }
  ],
  run: async (client, interaction) => {
    const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
    let data = await getLanguageData(interaction.guild.id);

    var sentences = interaction.options.getString("message-to-dev")
    let timeout = 18000000
    let cooldown = await db.get(`${interaction.guild.id}.USER.${interaction.user.id}.REPORT.cooldown`);

    if (cooldown !== null && timeout - (Date.now() - cooldown) > 0) {
      let time = ms(timeout - (Date.now() - cooldown));

      return interaction.reply({
        content: data.report_cooldown_command
          .replace("${time}", time)
      });
    } else {
      if (interaction.guild.ownerId != interaction.user.id) {
        return interaction.reply({ content: data.report_owner_need });
      }
      if (sentences.split(' ').length < 8) {
        return interaction.reply({ content: data.report_specify });
      }
      interaction.reply({ content: data.report_command_work });
      var embed = new EmbedBuilder()
        .setColor("#ff0000")
        .setDescription(`**${interaction.user.username}#${interaction.user.discriminator}** (<@${interaction.user.id}>) reported:\n~~--------------------------------~~\n${sentences}\n~~--------------------------------~~\nServer ID: **${interaction.guild.id}**`)

      client.channels.cache.get("975288553787494450").send({ embeds: [embed] }).catch(() => { });
      await db.set(`${interaction.guild.id}.USER.${interaction.user.id}.REPORT.cooldown`, Date.now());
    }
  }
};