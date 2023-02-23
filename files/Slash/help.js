const { MessageEmbed, MessageActionRow, MessageSelectMenu } = require("discord.js")

module.exports = {
  name: 'help',
  description: 'show help panel',
  run: async (client, interaction) => {
    embed = new MessageEmbed()
    .setColor('#e1a95f')
    .setDescription("Thanks you to use iHorizon !\nContact creator: `Kisakay#6051`.\nThis is a list of commands you can use.")
    .addField("Moderation", "`/ban`, `/kick`, `/clear`, `/lock`, `/unlock`, `/avatar`, `/lockall`,\n `/unban`, `/tempmute`, `/unmute`", true)
    .addField("Ranks", "`xp`, `setxpchannels`, `disablexp`", true)
    .addField("Fun", "`/caracteres`, `/cats`, `/hack`, `/hug`, `/kiss`, `/morse`, `/poll`, `/question`, `/slap`", true)
    .addField("Utils", "`/serverinfo`, `/userinfo`, `/snipe`, `/renew`", true)
    .addField("Giveaway", "`/start`, `/end`, `/reroll`", true)
    .addField("Bot", "`/status`, `/ping`, `/botinfo`, `/invite`", true)
    .addField("Music", "`/p`, `/loop`, `/nowplaying`, `/pause`, `/queue`, `/resume`, `/skip`, `/stop`", true)
    .addField("Backups", "`backup`", true)
    .addField('Guilds Config', '`/setchannels`, `/setjoinmessage`, `/setleavemessage`, `/setjoinroles`, `/setjoindm`, `/setup`, `/blockpub`, `/setprefix`, `/guildprofil`', true)
    .addField("Profils Customizations", "`/setprofildescriptions`, `/profil`, `/setprofilage`", true)
    .addField("Economy", "`/add-money`, `/balance`, `/daily`, `/monthly`, `/pay`, `/remove-money`, `/rob`, `/weekly`, `/work`", true)
    .addField("Ticket", "`/add`, `/close`, `/delete`, `/new`, `/open`, `/remove`, `/transript`, `/disableticket`", true)
    .addField("Owner", "`/owner`, `unowner`, `/blacklist`, `/unblacklist`", true)
    .addField("Role Reactions [NEW]",  "`/reactionroles`", true)
    .addField("Links", `[Support Discord](https://discord.gg/GMVmM3Gjfz) | [Add bot to your server](https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands)`, false)
    .setFooter({ text: 'iHorizon', iconURL: client.user.avatarURL({ format: 'png', dynamic: true, size: 512 })})
    .setThumbnail(client.user.avatarURL({ format: 'png', dynamic: true, size: 512 }))
    .setTimestamp()
   
    // if (!message.channel.permissionsFor(client.user).has("ADMINISTRATOR")) { message.channel.send("❌ I don't have permissions for work correctly...")}
    const initialMessage = await interaction.reply({ embeds: [embed] });

    const filter = (interaction) => interaction.user.id === interaction.member.id;
    }}