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

module.exports = {
  name: 'lock',
  description: 'Remove ability to speak of all users in this text channel',
  run: async (client, interaction) => {


    const Lockembed = new EmbedBuilder()
      .setColor("#5b3475")
      .setTimestamp()
      .setDescription(`The channel has been locked by <@${interaction.user.id}>.`);

    const permission = interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages);
    if (!permission) return interaction.reply({ content: "❌ | You don't have permission to lock channels." });

    interaction.channel.permissionOverwrites.create(interaction.guild.id, { SendMessages: false }).then(() => {
      interaction.reply({ embeds: [Lockembed] })
    }).catch(e => { return })
    try {
      logEmbed = new EmbedBuilder()
        .setColor("#bf0bb9")
        .setTitle("Lock Logs")
        .setDescription(`<@${interaction.user.id}> lock <#${interaction.channel.id}>`)

      let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
      if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
    } catch (e) { return };
    const filter = (interaction) => interaction.user.id === interaction.member.id;
  }
}
