const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
const db = require("quick.db")

module.exports = {
    name: 'setxpchannels',
    description: 'Set message channel earned by xp level',
    options: [
        {
            name: 'value',
            type: 'BOOLEAN',
            description: '<True= in custom channel/False=in the original message channel>',
            required: true
        },
        {
            name: 'channel',
            type: 'CHANNEL',
            description: '<channels id if the first args is "True">',
            required: false
        }
    ],
    run: async (client, interaction) => {
    let type = interaction.options.getBoolean("value")
    let argsid = interaction.options.getChannel("channel").id
      //const initialMessage = await interaction.reply({ embeds: [embed] });
  
      if(!interaction.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) return interaction.reply(":x: | You must be an administrator of this server to request this commands!");

 let help_embed = new MessageEmbed()
 .setColor("BLUE")
 .setTitle("/setxpchannels Help !")
 .setDescription('/setxpchannels <True= in custom channel/False=in the original message channel> <channels id if the first args is "True">')

 if (type === true) {
    try{
        if(!argsid) return interaction.reply("You must specify a valid channel for you configurations.")
        let ban_embed = new MessageEmbed()
                .setColor("PURPLE")
                .setTitle("SetXpChannels Logs")
                .setDescription(`<@${interaction.user.id}> set the custom xp channels to: <#${argsid}>`)
        let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
        logchannel.send({embeds: [ban_embed]})
        }catch(e){
        
        }  
 try{
    let already = db.fetch(`xpchannels-${interaction.guild.id}`)
        if(already === argsid) return interaction.reply('The custom xp channels is already config with this channels id!')
	 client.channels.cache.get(argsid).send("**Custom XP channel set here!**")
	 db.set(`xpchannels-${interaction.guild.id}`, argsid);
 
     return interaction.reply("You have successfully set the custom xp channel to <#"+argsid+">");

 }catch(e){
	 interaction.reply("Error: missing permissions or channel doesn't exist");
 }
 
 
}
 if (type == false) {
    try{
        let ban_embed = new MessageEmbed()
                .setColor("PURPLE")
                .setTitle("SetXpChannels Logs")
                .setDescription(`<@${interaction.user.id}> disable the custom xp channels. I put the default settings...`)
        let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
        logchannel.send({embeds: [ban_embed]})
        }catch(e){
        
        }  
       try{
        let already2 = db.fetch(`xpchannels-${interaction.guild.id}`)
        if(already2 === "off") return interaction.reply('The custom xp channels is already disable !')


        db.set(`xpchannels-${interaction.guild.id}`, "off");
        return interaction.reply("You have successfully disable the custom xp channel !");
   
       }catch(e){
        interaction.reply("Error: missing permissions or channel doesn't exist");
       }
   }
      const filter = (interaction) => interaction.user.id === interaction.member.id;
      }}
  

  
  