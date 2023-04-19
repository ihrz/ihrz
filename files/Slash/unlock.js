const { Client,
  Intents,
  EmbedBuilder,
  ApplicationCommandType,
  ApplicationCommandOptionType,
  Permissions,
  PermissionsBitField
} = require('discord.js');

module.exports = {
  name: 'unlock',
  description: 'Give ability to speak of all users in this text',
  run: async (client, interaction) => {

    const permission = interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels);
    if (!permission) return interaction.reply({ content: "❌ | You don't have permission to unlock channel." });
    const embed = new EmbedBuilder()
      .setColor("#5b3475")
      .setTimestamp()
      .setDescription(`The channel has been successfully unlocked!`);
    interaction.channel.permissionOverwrites.create(interaction.guild.id, { SendMessages: true });


    try {
      logEmbed = new EmbedBuilder()
        .setColor("#bf0bb9")
        .setTitle("Unlock Logs")
        .setDescription(`<@${interaction.user.id}> unlock <#${interaction.channel.id}>`)

      let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
      if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
    } catch (e) { console.error(e) };

    return interaction.reply({ embeds: [embed] });

    const filter = (interaction) => interaction.user.id === interaction.member.id;
  }
}
