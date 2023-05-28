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
const getLanguage = require(`${process.cwd()}/src/lang/getLanguage`);

module.exports = {
  name: 'serverinfo',
  description: 'Show the server informations',
  run: async (client, interaction) => {
    let fileContents = fs.readFileSync(`${process.cwd()}/src/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
    let data = yaml.load(fileContents);

    const verlvl = {
      NONE: data.serverinfo_verlvl_NONE,
      LOW: data.serverinfo_verlvl_LOW,
      MEDIUM: data.serverinfo_verlvl_MEDIUM,
      HIGHT: data.serverinfo_verlvl_HIGHT,
      VERY_HIGHT: data.serverinfo_verlvl_VERY_HIGHT
    };
    
    let embeds = new EmbedBuilder()
      .setColor("#C3B2A1")
      .setAuthor({ name: data.serverinfo_embed_author
        .replace(/\${interaction\.guild\.name}/g, interaction.guild.name)
        , iconURL: `https://cdn.discordapp.com/icons/${interaction.guild.id}/${interaction.guild.icon}.png` })
      .setDescription(data.serverinfo_embed_description
        .replace(/\${interaction\.guild\.description}/g, interaction.guild.description))
      .addFields(
        { name: data.serverinfo_embed_fields_name, value: `📕\`${interaction.guild.name}\``, inline: true },
        { name: data.serverinfo_embed_fields_members, value: `📕\`${interaction.guild.memberCount}\``, inline: true },
        { name: data.serverinfo_embed_fields_id, value: `📕\`${interaction.guild.id}\``, inline: true },
        { name: data.serverinfo_embed_fields_owner, value: `➡\<@${interaction.guild.ownerId}>`, inline: true },
        { name: data.serverinfo_embed_fields_verlvl, value: `📕\`${verlvl[interaction.guild.verificationLevel]}\``, inline: true },
        { name: data.serverinfo_embed_fields_region, value: `📕\`${interaction.guild.preferredLocale}\``, inline: true },
        { name: data.serverinfo_embed_fields_roles, value: `📕\`${interaction.guild.roles.cache.size}\``, inline: true },
        { name: data.serverinfo_embed_fields_channels, value: `📕\`${interaction.guild.channels.cache.size}\``, inline: true },
        { name: data.serverinfo_embed_fields_joinat, value: `📕\`${interaction.member.joinedAt}\``, inline: true },
        { name: data.serverinfo_embed_fields_createat, value: `📕\`${interaction.guild.createdAt}\``, inline: true }
      )
      .setTimestamp()
      .setThumbnail(`https://cdn.discordapp.com/icons/${interaction.guild.id}/${interaction.guild.icon}.png`)
      .setImage(`https://cdn.discordapp.com/icons/${interaction.guild.id}/${interaction.guild.banner}.png`)
    return interaction.reply({ embeds: [embeds] });

  }
}