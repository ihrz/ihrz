const { Client,
  Intents,
  EmbedBuilder,
  ApplicationCommandType,
  ApplicationCommandOptionType,
  Permissions,
  PermissionsBitField
} = require('discord.js');

const yaml = require('js-yaml');
const fs = require('fs');

module.exports = {
  name: 'unban',
  description: 'Unban banned user in the guild !',
  options: [
    {
      name: 'userid',
      type: ApplicationCommandOptionType.String,
      description: 'The id of the user you wan\'t to unban !',
      required: true
    },
    {
      name: 'reason',
      type: ApplicationCommandOptionType.String,
      description: 'The reason for unbanning this user.',
      required: false
    }
  ],
  run: async (client, interaction) => {
    let fileContents = fs.readFileSync(process.cwd() + "/files/lang/en-US.yml", 'utf-8');
    let data = yaml.load(fileContents);

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return interaction.reply({ content: data.unban_dont_have_permission });
    }

    if (!interaction.guild.members.me.permissions.has([PermissionsBitField.Flags.BanMembers])) {
      return interaction.reply({ content: data.unban_bot_dont_have_permission })
    }

    const userID = interaction.options.getString('userid');
    let reason = interaction.options.getString('reason');
    if (!reason) reason = "No reason was provided."

    await interaction.guild.bans.fetch()
      .then(async bans => {
        if (bans.size == 0) {
          return await interaction.reply({ content: data.unban_there_is_nobody_banned });
        }
        let bannedID = bans.find(ban => ban.user.id == userID);
        if (!bannedID) return await interaction.reply({ content: data.unban_the_member_is_not_banned });
        await interaction.guild.bans.remove(userID, reason).catch(err => console.error(err));
        await interaction.reply({ content: data.unban_is_now_unbanned
          .replace(/\${userID}/g, userID)
        })
      })
      .catch(err => console.error(err));

    try {
      logEmbed = new EmbedBuilder().setColor("#bf0bb9").setTitle("")
        .setDescription(data.unban_logs_embed_description
          .replace(/\${userID}/g, userID)
          .replace(/\${interaction\.user\.id}/g, interaction.user.id)
          )
      let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
      if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
    } catch (e) { console.error(e) };
  }
}