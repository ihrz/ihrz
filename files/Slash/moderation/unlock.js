const { Client,
  Intents,
  EmbedBuilder,
  ApplicationCommandType,
  ApplicationCommandOptionType,
  Permissions,
  PermissionsBitField
} = require('discord.js');

const yaml = require('js-yaml'), fs = require('fs');
const getLanguage = require(`${process.cwd()}/files/lang/getLanguage`);
const logger = require(`${process.cwd()}/files/core/logger`);

module.exports = {
  name: 'unlock',
  description: 'Give ability to speak of all users in this text',
  run: async (client, interaction) => {
    let fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
    let data = yaml.load(fileContents);
    
    const permission = interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels);
    if (!permission) return interaction.reply({ content: data.unlock_dont_have_permission });
    const embed = new EmbedBuilder()
      .setColor("#5b3475")
      .setTimestamp()
      .setDescription(data.unlock_embed_message_description);
    interaction.channel.permissionOverwrites.create(interaction.guild.id, { SendMessages: true });


    try {
      logEmbed = new EmbedBuilder()
        .setColor("#bf0bb9")
        .setTitle(data.unlock_logs_embed_title)
        .setDescription(data.unlock_logs_embed_description
          .replace(/\${interaction\.user\.id}/g, interaction.user.id)
          .replace(/\${interaction\.channel\.id}/g, interaction.channel.id)
        )
      let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
      if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
    } catch (e) { logger.err(e) };

    return interaction.reply({ embeds: [embed] });
  }
}
