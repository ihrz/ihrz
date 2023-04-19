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


    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply(":x: | You must be an administrator of this server to request a welcome channels commands!");
    let type = interaction.options.getString("value")
    let messagei = interaction.options.getString("message")

    let help_embed = new EmbedBuilder()
      .setColor("#0014a8")
      .setTitle("setjoinmessage Help !")
      .setDescription('/setjoinmessage <Power on /Power off/Show the message set> <join message>')
      .addField('how to use ?',
        `Use \`\`\`/setjoinmessage <Power on /Power off/Show the message set> <message>\`\`\`
  {user} = Username of Member
  {membercount} = guild's member count
  {createdat} = member account creation date
  {guild} = The name of the guild
  {inviter} = The inviter username & discriminator
  {invites} = The invites count of him`)

    if (type == "on") {
      if (messagei) {
        let joinmsgreplace = messagei
          .replace("{user}", "{user}")
          .replace("{guild}", "{guild}")
          .replace("{createdat}", "{createdat}")
          .replace("{membercount}", "{membercount}")
        await db.set(`${interaction.guild.id}.GUILD.GUILD_CONFIG.joinmessage`, joinmsgreplace)
        try {
          logEmbed = new EmbedBuilder()
            .setColor("#bf0bb9")
            .setTitle("SetJoinMessage Logs")
            .setDescription(`<@${interaction.user.id}> set the join message !`)

          let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
          if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
        } catch (e) { console.error(e) };

        return interaction.reply(`✅ | Succefully set custom join message.`)

      }
    } else {
      if (type == "off") {
        await db.delete(`${interaction.guild.id}.GUILD.GUILD_CONFIG.joinmessage`);
        try {
          logEmbed = new EmbedBuilder()
            .setColor("#bf0bb9")
            .setTitle("SetJoinMessage Logs")
            .setDescription(`<@${interaction.user.id}> deleted the join message !`)

          let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
          if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
        } catch (e) { console.error(e) };


        return interaction.reply(`✅ | Succefully deleted custom join message.`)
      }
    }
    if (type == "ls") {
      var ls = await db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.joinmessage`);
      return interaction.reply("The join message is: \n```" + ls + "```")
    }
    if (!type) {
      return interaction.reply({ embeds: [help_embed] })
    }
    if (!messagei) {
      return interaction.reply({ embeds: [help_embed] })
    }

    if (!type == "ls" || "on" || "off") {
      return interaction.reply({ embeds: [help_embed] })
    }
    const filter = (interaction) => interaction.user.id === interaction.member.id;
  }
}
