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

module.exports = {
  name: 'setjoinmessage',
  description: 'Set a join message when user join the server',
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
      description: `{user}:username| {membercount}:guild member count| {createdat}:user create date| {guild}:Guild name`
    },

  ],
  run: async (client, interaction) => {
    const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
    let data = getLanguageData(interaction.guild.id);
        
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: data.setjoinmessage_not_admin });
    }
    let type = interaction.options.getString("value")
    let messagei = interaction.options.getString("message")

    let help_embed = new EmbedBuilder()
      .setColor("#0014a8")
      .setTitle(data.setjoinmessage_help_embed_title)
      .setDescription(data.setjoinmessage_help_embed_description)
      .addFields({
        name: data.setjoinmessage_help_embed_fields_name,
        value: data.setjoinmessage_help_embed_fields_value
      })

    if (type == "on") {
      if (messagei) {
        let joinmsgreplace = messagei
          .replace("{user}", "{user}")
          .replace("{guild}", "{guild}")
          .replace("{createdat}", "{createdat}")
          .replace("{membercount}", "{membercount}")
        await db.set(`${interaction.guild.id}.GUILD.GUILD_CONFIG.joinmessage`, joinmsgreplace)

        try {
          let logEmbed = new EmbedBuilder()
            .setColor("#bf0bb9")
            .setTitle(data.setjoinmessage_logs_embed_title_on_enable)
            .setDescription(data.setjoinmessage_logs_embed_description_on_enable
              .replace("${interaction.user.id}", interaction.user.id)
            )

          let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
          if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
        } catch (e) { };

        return interaction.reply({ content: data.setjoinmessage_command_work_on_enable })
      }
    } else {
      if (type == "off") {
        await db.delete(`${interaction.guild.id}.GUILD.GUILD_CONFIG.joinmessage`);
        try {
          logEmbed = new EmbedBuilder()
            .setColor("#bf0bb9")
            .setTitle(data.setjoinmessage_logs_embed_title_on_disable)
            .setDescription(data.setjoinmessage_logs_embed_description_on_disable
              .replace("${interaction.user.id}", interaction.user.id)
            )

          let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
          if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
        } catch (e) { };


        return interaction.reply({ content: data.setjoinmessage_command_work_on_disable })
      }
    }
    if (type == "ls") {
      var ls = await db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.joinmessage`);
      return interaction.reply({
        content: data.setjoinmessage_command_work_ls
          .replace("${ls}", ls)
      })
    }
    if (!messagei) {
      return interaction.reply({ embeds: [help_embed] })
    }
  }
}
