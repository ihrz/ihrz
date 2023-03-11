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
  name: 'serverinfo',
  description: 'Show the server informations',
  run: async (client, interaction) => {

  const filter = (interaction) => interaction.user.id === interaction.member.id;
  const verlvl = {
    NONE: "NONE",
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    HIGHT: "(╯°□°）╯︵ ┻━┻",
    VERY_HIGHT: "(ノಠ益ಠ)ノ彡┻━┻ "
  };
    let embeds = new EmbedBuilder()
    .setColor("#C3B2A1")
    .setAuthor({ name: `🚩 -> ${interaction.guild.name}`, iconURL: `https://cdn.discordapp.com/icons/${interaction.guild.id}/${interaction.guild.icon}.png`})
    .setDescription(`**Descriptions**: ${interaction.guild.description}`)
    .addFields(
      {name: "🏷・**Name:**", value: `📕\`${interaction.guild.name}\``, inline: true},
      {name: "🧔・**Members:**", value: `📕\`${interaction.guild.memberCount}\``, inline: true},
      {name: "🆔・**ID:**", value: `📕\`${interaction.guild.id}\``, inline: true},
      {name: "👑・**Owner:**", value: `➡\<@${interaction.guild.ownerId}>`, inline: true},
      {name: "🎚 ・**Verification Level:**", value: `📕\`${verlvl[interaction.guild.verificationLevel]}\``, inline: true},
      {name: "🌍・**Region:**", value: `📕\`${interaction.guild.preferredLocale}\``, inline: true},
      {name: "📇・**Role(s) number:**", value: `📕\`${interaction.guild.roles.cache.size}\``, inline: true},
      {name: "✍・**Channel(s) number:**", value: `📕\`${interaction.guild.channels.cache.size}\``, inline: true},
      {name: "🚲・**Join at:**", value: `📕\`${interaction.member.joinedAt}\``, inline: true},
      {name: `⚓・**Create at:**`, value:  `📕\`${interaction.guild.createdAt}\``, inline: true}
    )
    .setTimestamp()
    .setThumbnail(`https://cdn.discordapp.com/icons/${interaction.guild.id}/${interaction.guild.icon}.png`)
    .setImage(`https://cdn.discordapp.com/icons/${interaction.guild.id}/${interaction.guild.banner}.png`)
    return interaction.reply({embeds: [embeds]});

}}