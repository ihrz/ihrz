const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
const ms = require("ms");

module.exports = {
  name: 'unmute',
  description: 'Unmute a muted user in the guild',
  options: [
    {
        name: 'user',
        type: 'USER',
        description: 'The user you want to unmuted',
        required: true
    }
],
  run: async (client, interaction) => {

    let tomute = interaction.options.getMember("user")
    if(!tomute) return interaction.reply("Please tag user to mute!");
    const permission = interaction.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)
    if (!permission) return interaction.reply({content: "❌ | You don't have permission to tempmute members."});
    if (!interaction.guild.me.permissions.has([Permissions.FLAGS.MANAGE_ROLES])) {return interaction.reply({content: `I don't have permission.`})}
    if (tomute.id === interaction.user.id) return interaction.reply("You cannot mute yourself!");
    let muterole = interaction.guild.roles.cache.find(role => role.name === 'muted');
    
    if(!tomute.roles.cache.has(muterole.id)) return interaction.reply("This user is not muted !")
  
    if(!muterole){
   return interaction.reply("The `muted` role does not exist. Please mute the user **before** for mute roles creation...")
    }
  
  
      tomute.roles.remove(muterole.id);
      interaction.reply(`<@${tomute.id}> has been unmuted!`);
     
      try{
        let ban_embed = new MessageEmbed()
                .setColor("PURPLE")
                .setTitle("Unmute Logs")
                .setDescription(`<@${interaction.user.id}> unmute <@${tomute.id}>`)
        let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
        logchannel.send({embeds: [ban_embed]})
        }catch(e){
            
        }  

    const filter = (interaction) => interaction.user.id === interaction.member.id;
    }}