const { Client, Intents, Collection, MessageEmbed, Permissions} = require('discord.js');

module.exports = {
  name: 'unban',
  description: 'Unban banned user in the guild !',
  options: [
    {
        name: 'userid',
        type: 'STRING',
        description: 'The id of the user you wan\'t to unban !',
        required: true
    }
],
  run: async (client, interaction) => {
typed = interaction.options.getString("userid")
    try{
      let bannedMember = await client.users.fetch(typed) //fetch
      if(!bannedMember){ return interaction.reply(`I couldn't find this user`)} //l'id invalid A
      if (!interaction.member.permissions.has(Permissions.FLAGS.BAN_MEMBERS)) return interaction.reply({content: "❌ | You don't have permission to unban members."});//pas les perm mdrr B
      if (!interaction.guild.me.permissions.has([Permissions.FLAGS.ADMINISTRATOR])) {return interaction.reply({content: `I don't have permission.`})}//pas les perms pour horizon C
      try{
        let ban_embed = new MessageEmbed()
                .setColor("PURPLE")
                .setTitle("Unban Logs")
                .setDescription(`<@${interaction.user.id}> unban user with this id: ${bannedMember.id}`)
        let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
        logchannel.send({embeds: [ban_embed]})
        }catch(e){
            console.error(e)
        }  
        interaction.reply({content: "⌛"})
      interaction.guild.members.unban(bannedMember)
      .then(interaction.editReply({content: `⌛`}))
      .catch(err => { interaction.editReply(":mag_right: This user is not in the ban list of this guild !")
      return console.error(err)})//pas dans les bannis 2
      interaction.channel.send(`<@${bannedMember.id}> **is unbanned from this server!**`)
    }catch(e){
      const permission = interaction.member.permissions.has(Permissions.FLAGS.BAN_MEMBERS)
      if (!permission) return interaction.channel.send({content: "❌ | You don't have permission to unban members."})
        return interaction.channel.send('🔎 User not found !')
    }
    }}





