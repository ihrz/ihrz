const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');;
const db = require("quick.db");
const { help } = require('./help');

module.exports = {
    name: 'setjoindm',
    description: 'Set a join dm message when user join the guild',
    options: [
        {
            name: "value",
            description: "<Power on /Power off/Show the message set>",
            type: "STRING",
            required: true,
            choices: [
                {
                    name: "Power on",
                    value: "on"
                },
                {
                    name: "Power off",
                    value: "off"
                },
                {
                  name: "Show the message set",
                  value: "ls"
              },
              {
                name: "Need help",
                value: "needhelp"
            }
            ]
        },
        {
            name: 'message',
            type: 'STRING',
            description: '<Message if the first args is on>',
            required: false
        }
    ],
    run: async (client, interaction) => {
  
      
if(!interaction.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) return interaction.reply({content: ":x: | You must be an administrator of this server to request a welcome channels commands!"});
    
let type = interaction.options.getString("value")

let dm_msg = interaction.options.getString("message")

let help_embed = new MessageEmbed()
.setColor("BLUE")
.setTitle("/setjoindm Help !")
.setDescription('/setjoindm <on/off/ls> <Message if the first args is on>')

if (type === "on") {
if(!dm_msg) return interaction.reply({embeds: [help_embed]})
try{
   if(!dm_msg) return interaction.reply({content: "You must specify a valid message for you join dm."})
    db.set(`joindm-${interaction.guild.id}`, dm_msg);
    return interaction.reply({content: "You have successfully set the join dm to :```"+dm_msg+"``` And enable it "});

}catch(e){
   interaction.reply({content: "Error: missing permissions or channel doesn't exist"});
}
try{
   let ban_embed = new MessageEmbed()
           .setColor("PURPLE")
           .setTitle("SetJoinDm Logs")
           .setDescription(`<@${interaction.user.id}> set the join dm message !`)
   let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
   logchannel.send({embeds: [ban_embed]})
   }catch(e){
       return
   }  
}

if (type === "off") {
   try{
       let already_off = db.fetch(`joindm-${interaction.guild.id}`)
       if(already_off === "off") return interaction.reply("The join dm message is already disable !")
       db.set(`joindm-${interaction.guild.id}`, "off");
       return interaction.reply({content: "You have successfully disable the join dm !"});
  
   }catch(e){
       console.log(e)
      interaction.reply({content: "Error: missing permissions or channel doesn't exist"});
   }
   try{
       let ban_embed = new MessageEmbed()
               .setColor("PURPLE")
               .setTitle("SetJoinDm Logs")
               .setDescription(`<@${message.author.id}> disable the join dm message !`)
       let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
       logchannel.send({embeds: [ban_embed]})
       }catch(e){
           return;
       }  
}
if (type === "ls") {
   let already_off = db.fetch(`joindm-${interaction.guild.id}`)
   if (already_off === null) {
       return interaction.reply({content: "They are no join dm setup here !"})
   }
  return interaction.reply({content: "The join dm message is: \n```"+already_off+"```"})
}else{
interaction.reply({embeds: [help_embed]})
}
  
      const filter = (interaction) => interaction.user.id === interaction.member.id;
      }}
      