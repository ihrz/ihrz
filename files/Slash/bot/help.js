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
const getLanguage = require(`${process.cwd()}/files/lang/getLanguage`);
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = {
  name: 'help',
  description: 'show help panel',
  run: async (client, interaction) => {
    let fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
    let data = yaml.load(fileContents);
    let CONTENT = await db.get("BOT.CONTENT");
    const embed = new EmbedBuilder()
      .setColor('#001eff')
      .setDescription(data.help_tip_embed)
      .addFields(
        { name: data.help_mod_fields, value: CONTENT.moderation.toString(), inline: true },
        { name: data.help_ranks_fields, value: CONTENT.ranks.toString(), inline: true },
        { name: data.help_fun_fields, value: CONTENT.fun.toString(), inline: true },
        { name: data.help_utils_fields, value: CONTENT.utils.toString(), inline: true },
        { name: data.help_giveaway_fields, value: CONTENT.giveaway.toString(), inline: true },
        { name: data.help_bot_fields, value: CONTENT.bot.toString(), inline: true },
        { name: data.help_music_fields, value: CONTENT.music.toString(), inline: true },
        { name: data.help_backup_fields, value: CONTENT.backup.toString(), inline: true },
        { name: data.help_guildconf_fields, value: CONTENT.guildconfig.toString(), inline: true },
        { name: data.help_prof_fields, value: CONTENT.profil.toString(), inline: true },
        { name: data.help_economy_fields, value: CONTENT.economy.toString(), inline: true },
        { name: data.help_owner_fields, value: CONTENT.owner.toString(), inline: true },
        { name: data.help_roler_fields, value: CONTENT.rolereactions.toString(), inline: true },
        { name: data.help_invitem_fields, value: CONTENT.invitemanager.toString(), inline: true },
        { name: data.help_ticket_fields, value: CONTENT.ticket.toString(), inline: true },
        { name: data.help_memberc_fields, value: CONTENT.membercount.toString(), inline: true },
        { name: data.help_newftrs_fields, value: CONTENT.newfeatures.toString(), inline: true },
      )
      .setFooter({ text: 'iHorizon', iconURL: client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 }) })
      .setThumbnail(client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 512 }))
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
}