const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');

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
    let embeds = new MessageEmbed()
    .setColor("LIGHT_GREY")
    .setAuthor(`🚩 -> ${interaction.guild.name}`)
    .setDescription(`**Descriptions**: ${interaction.guild.description}`)
    .addField("🏷・**Name:**", `📕\`${interaction.guild.name}\``, true)
    .addField("🧔・**Members:**", `📕\`${interaction.guild.memberCount}\``, true)
    .addField("🆔・**ID:**", `📕\`${interaction.guild.id}\``, true)
    .addField("👑・**Owner:**", `➡\<@${interaction.guild.ownerId}>`, true)
    .addField("🎚 ・**Verification Level:**", `📕\`${verlvl[interaction.guild.verificationLevel]}\``, true)
    .addField("🌍・**Region:**", `📕\`${interaction.guild.preferredLocale}\``, true)
    .addField("📇・**Role(s) number:**", `📕\`${interaction.guild.roles.cache.size}\``, true)
    .addField("✍・**Channel(s) number:**", `📕\`${interaction.guild.channels.cache.size}\``, true)
    .addField("🚲・**Join at:**", `📕\`${interaction.member.joinedAt}\``, true)
    .addField(`⚓・**Create at:**`, `📕\`${interaction.guild.createdAt}\``, true)
    .setTimestamp()
    .setThumbnail(`https://cdn.discordapp.com/icons/${interaction.guild.id}/${interaction.guild.icon}.png`)
    .setImage(`https://cdn.discordapp.com/icons/${interaction.guild.id}/${interaction.guild.banner}.png`)
    return interaction.reply({embeds: [embeds]});

}}