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

const yaml = require('js-yaml');
const fs = require('fs');
const getLanguage = require(`${process.cwd()}/src/lang/getLanguage`);

module.exports = {
  name: 'setleavemessage',
  description: 'Set a leave message when user leave the server',
  options: [
    {
      name: "value",
      description: "<Power on /Power off/Show the message set>",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        {
          name: "Power on",
          value: "on"
        },
        {
          name: "Power off",
          value: "off"
        },
        {
          name: "Show the message set",
          value: "ls"
        },
        {
          name: "Need help",
          value: "needhelp"
        }
      ]
    },
    {
      name: 'message',
      type: ApplicationCommandOptionType.String,
      description: `{user} = Username of Member | {membercount} = guild's member count | {guild} = The name of the guild`,
      required: false
    },
  ],
  run: async (client, interaction) => {
    let fileContents = fs.readFileSync(`${process.cwd()}/src/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
    let data = yaml.load(fileContents);

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
  }
}
