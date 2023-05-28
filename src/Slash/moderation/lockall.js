const {
  Client,
  Intents,
  Collection,
  EmbedBuilder,
  Permissions,
  ApplicationCommandType,
  PermissionsBitField,
  ApplicationCommandOptionType,
  ChannelType
} = require('discord.js');

const logger = require(`${process.cwd()}/src/core/logger`);

module.exports = {
  name: 'lockall',
  description: 'Remove ability to speak of all users in all of text channel on the guild',
  run: async (client, interaction) => {
    const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
    let data = getLanguageData(interaction.guild.id);

    const permission = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
    if (!permission) return interaction.reply({ content: data.lockall_dont_have_permission });
    interaction.guild.channels.cache.forEach(c => {
      if (c.type === ChannelType.GuildText) { c.permissionOverwrites.create(interaction.guild.id, { SendMessages: false }) };
    })
    const Lockembed = new EmbedBuilder()
      .setColor("#5b3475")
      .setTimestamp()
      .setDescription(data.lockall_embed_message_description
        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
      );

    try {
      logEmbed = new EmbedBuilder()
        .setColor("#bf0bb9")
        .setTitle(data.lockall_logs_embed_title)
        .setDescription(data.lockall_logs_embed_description
          .replace(/\${interaction\.user\.id}/g, interaction.user.id)
        )
      let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
      if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
    } catch (e) { logger.err(e) };
    return interaction.reply({ embeds: [Lockembed] })
  }
}

