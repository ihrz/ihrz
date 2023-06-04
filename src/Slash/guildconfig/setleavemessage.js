/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2023 iHorizon
*/

const slashInfo = require(`${process.cwd()}/files/ihorizon-api/slashHandler`);

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
const { QuickDB } = require("quick.db");
const db = new QuickDB();

slashInfo.guildconfig.setleavemessage.run = async (client, interaction) => {
  const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
  let data = await getLanguageData(interaction.guild.id);

  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: data.setleavemessage_not_admin });
  }

  let type = interaction.options.getString("value")
  let messagei = interaction.options.getString("message")

  let help_embed = new EmbedBuilder()
    .setColor("#016c9a")
    .setTitle(data.setleavemessage_help_embed_title)
    .setDescription(data.setleavemessage_help_embed_description)
    .addFields({
      name: data.setleavemessage_help_embed_fields_name,
      value: data.setleavemessage_help_embed_fields_value
    })

  if (type == "on") {
    if (messagei) {
      let joinmsgreplace = messagei
        .replace("{user}", "{user}")
        .replace("{guild}", "{guild}")
        .replace("{membercount}", "{membercount}")
      await db.set(`${interaction.guild.id}.GUILD.GUILD_CONFIG.leavemessage`, joinmsgreplace)

      try {
        logEmbed = new EmbedBuilder()
          .setColor("#bf0bb9")
          .setTitle(data.setleavemessage_logs_embed_title_on_enable)
          .setDescription(data.setleavemessage_logs_embed_description_on_enable
            .replace("${interaction.user.id}", interaction.user.id)
          )

        let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
        if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
      } catch (e) { logger.err(e) };

      return interaction.reply({ content: data.setleavemessage_command_work_on_enable })
    }

  } else {
    if (type == "off") {
      await db.delete(`${interaction.guild.id}.GUILD.GUILD_CONFIG.leavemessage`);
      try {
        let ban_embed = new EmbedBuilder()
          .setColor("#bf0bb9")
          .setTitle(data.setleavemessage_logs_embed_title_on_disable)
          .setDescription(data.setleavemessage_logs_embed_description_on_disable
            .replace("${interaction.user.id}", interaction.user.id)
          )
        let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
        logchannel.send({ embeds: [ban_embed] })
      } catch (e) { logger.err(e) }
      return interaction.reply({ content: data.setleavemessage_command_work_on_disable })
    }
  }
  if (type == "ls") {
    var ls = await db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.leavemessage`);
    return interaction.reply({ content: data.setleavemessage_command_work_ls })
  }
  if (!messagei) {
    return interaction.reply({ embeds: [help_embed] })
  }
};

module.exports = slashInfo.guildconfig.setleavemessage;