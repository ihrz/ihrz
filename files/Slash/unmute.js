const { Client, Intents, Collection, MessageEmbed, Permissions, ApplicationCommandType, PermissionsBitField, ApplicationCommandOptionType } = require('discord.js');
const ms = require("ms");

module.exports = {
  name: 'unmute',
  description: 'Unmute a muted user in the guild',
  options: [
    {
        name: 'user',
        type: ApplicationCommandOptionType.User,
        description: 'The user you want to unmuted',
        required: true
    }
],
  run: async (client, interaction) => {

    let tomute = interaction.options.getMember("user")
    if(!tomute) return interaction.reply("Please tag user to mute!");
    const permission = interaction.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)
    if (!permission) return interaction.reply({content: "❌ | You don't have permission to tempmute members."});
    if (interaction.guild.members.me.permissions.has([PermissionsBitField.Flags.ManageRoles])) {return interaction.reply({content: `I don't have permission.`})}
    if (tomute.id === interaction.user.id) return interaction.reply("You cannot mute yourself!");
    let muterole = interaction.guild.roles.cache.find(role => role.name === 'muted');
    
    if(!tomute.roles.cache.has(muterole.id)) return interaction.reply("This user is not muted !")
  
    if(!muterole){
   return interaction.reply("The `muted` role does not exist. Please mute the user **before** for mute roles creation...")
    }
  
  
      tomute.roles.remove(muterole.id);
      interaction.reply(`<@${tomute.id}> has been unmuted!`);
 try{
          logEmbed = new MessageEmbed()
          .setColor("PURPLE")
          .setTitle("Unmute Logs")
          .setDescription(`<@${interaction.user.id}> unmute <@${tomute.id}>`)

                  let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                  if(logchannel) { logchannel.send({embeds: [logEmbed]}) }
                  }catch(e) { console.error(e) };
    const filter = (interaction) => interaction.user.id === interaction.member.id;
    }}