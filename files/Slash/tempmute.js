const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
const ms = require("ms");

module.exports = {
  name: 'tempmute',
  description: 'Tempmute a user in the guild',
  options: [
    {
      name: 'user',
      type: 'USER',
      description: 'The user you want to unmuted',
      required: true
  },
  {
    name: 'time',
    type: 'STRING',
    description: 'the duration of the user\'s tempmute',
    required: true
}
],
  run: async (client, interaction) => {
    let mutetime = interaction.options.getString("time")
    let tomute = interaction.options.getMember("user")
    if(!tomute) return interaction.reply("Please tag user to mute!");
    const permission = interaction.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)
    if (!permission) return interaction.reply({content: "❌ | You don't have permission to tempmute members."});
    if (!interaction.guild.me.permissions.has([Permissions.FLAGS.MANAGE_ROLES])) {return interaction.reply({content: `I don't have permission.`})}
    if (tomute.id === interaction.user.id) return interaction.reply("You cannot mute yourself!");
    let muterole = interaction.guild.roles.cache.find(role => role.name === 'muted');
  
    if(!muterole){
      try{
        muterole = await interaction.guild.roles.create({ name: "muted", 
        reason: "Create tempmute muted role!" })
    
        interaction.guild.channels.cache.forEach(async (channel, id) => {
          await channel.permissionOverwrites.create(muterole, {
            SEND_MESSAGES: false,
            ADD_REACTIONS: false
        });
        });
      }catch(e){
       //console.log(e.stack);
      }
    }
  
    if(tomute.roles.cache.has(muterole.id)){
      return interaction.reply("This user is already muted !")
  }
    if(!mutetime) return interaction.reply("You didn't specify a time!");
  
    await(tomute.roles.add(muterole.id));
    interaction.reply(`<@${tomute.id}> has been muted for ${ms(ms(mutetime))}`);
  
    setTimeout(function(){
      if(!tomute.roles.cache.has(muterole.id)){ return}      
      tomute.roles.remove(muterole.id);
      interaction.channel.send(`<@${tomute.id}> has been unmuted!`);
    }, ms(mutetime));
  
      try{
        logEmbed = new MessageEmbed()
        .setColor("PURPLE")
        .setTitle("Tempmute Logs")
        .setDescription(`<@${interaction.user.id}> mute <@${tomute.id}> for ${ms(ms(mutetime))}`)

                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                if(logchannel) { logchannel.send({embeds: [logEmbed]}) }
                }catch(e) { console.error(e) };
      
    const filter = (interaction) => interaction.user.id === interaction.member.id;
    }}