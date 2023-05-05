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

module.exports = {
  name: 'help',
  description: 'show help panel',
  run: async (client, interaction) => {
    let fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
    let data = yaml.load(fileContents);

    const embed = new EmbedBuilder()
      .setColor('#001eff')
      .setDescription(data.help_tip_embed)
      .addFields(
        { name: data.help_mod_fields, value: "`/ban`, `/kick`, `/clear`, `/lock`, `/unlock`, `/avatar`, `/lockall`,\n `/unban`, `/tempmute`, `/unmute`", inline: true },
        { name: data.help_ranks_fields, value: "`/xp`, `/setxpchannels`, `/disablexp`", inline: true },
        { name: data.help_fun_fields, value: "`/caracteres`, `/cats`, `/hack`, `/hug`, `/kiss`, `/morse`, `/poll`, `/question`, `/slap`", inline: true },
        { name: data.help_utils_fields, value: "`/serverinfo`, `/userinfo`, `/snipe`, `/renew`", inline: true },
        { name: data.help_giveaway_fields, value: "`/start`, `/end`, `/reroll`", inline: true },
        { name: data.help_bot_fields, value: "`/status`, `/ping`, `/botinfo`, `/invite`, `/kisakay`", inline: true },
        { name: data.help_music_fields, value: "`/p`, `/loop`, `/nowplaying`, `/pause`, `/resume`, `/skip`, `/stop`, `/queue`, `/shuffle`", inline: true },
        { name: data.help_backup_fields, value: "`/backup`", inline: true },
        { name: data.help_guildconf_fields, value: '`/setchannels`, `/setjoinmessage`, `/setleavemessage`, `/setjoinroles`, `/setjoindm`, `/setup`, `/blockpub`, `/guildprofil`', inline: true },
        { name: data.help_prof_fields, value: "`/setprofildescriptions`, `/profil`, `/setprofilage`", inline: true },
        { name: data.help_economy_fields, value: "`/add-money`, `/balance`, `/daily`, `/monthly`, `/pay`, `/remove-money`, `/rob`, `/weekly`, `/work`", inline: true },
        { name: data.help_owner_fields, value: "`/owner`, `/unowner`, `/blacklist`, `/unblacklist`", inline: true },
        { name: data.help_roler_fields, value: "`/reactionroles`", inline: true },
        { name: data.help_invitem_fields, value: "`/removeinvites`, `/invites`,`/addinvites`, `/leaderboard`", inline: true },
        { name: data.help_ticket_fields, value: "`/add`, `/close`, `/delete`, `/sethereticket`, `/open`, `/remove`, `/transript`, `/disableticket`", inline: true },
        { name: data.help_memberc_fields, value: "`/setmembercount`", inline: true },
        { name: data.help_newftrs_fields, value: "`/support`, `/punishpub`, `/report`", inline: true },
      )
      .setFooter({ text: 'iHorizon', iconURL: client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 }) })
      .setThumbnail(client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 512 }))
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
}