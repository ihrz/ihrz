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
  name: 'lock',
  description: 'Remove ability to speak of all users in this text channel',
  run: async (client, interaction) => {
    let fileContents = fs.readFileSync(process.cwd() + "/files/lang/en-US.yml", 'utf-8');
    let data = yaml.load(fileContents)

    const Lockembed = new EmbedBuilder()
      .setColor("#5b3475")
      .setTimestamp()
      .setDescription(data.lock_embed_message_description
        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
      );

    const permission = interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages);
    if (!permission) return interaction.reply({ content: data.lock_dont_have_permission });

    interaction.channel.permissionOverwrites.create(interaction.guild.id, { SendMessages: false }).then(() => {
      interaction.reply({ embeds: [Lockembed] })
    }).catch(() => { })
    try {
      logEmbed = new EmbedBuilder()
        .setColor("#bf0bb9")
        .setTitle(data.lock_logs_embed_title)
        .setDescription(data.lock_logs_embed_description
          .replace(/\${interaction\.user\.id}/g, interaction.user.id)
          .replace(/\${interaction\.channel\.id}/g, interaction.channel.id)
        )
      let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
      if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
    } catch (e) { return };
  }
}
