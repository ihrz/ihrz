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
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = {
    name: 'setjoindm',
    description: 'Set a join dm message when user join the guild',
    options: [
        {
            name: "value",
            description: "<Power on /Power off/Show the message set>",
            type: ApplicationCommandOptionType.String,
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
            type: ApplicationCommandOptionType.String,
            description: '<Message if the first args is on>',
            required: false
        }
    ],
    run: async (client, interaction) => {
  
      
if(!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({content: ":x: | You must be an administrator of this server to request a welcome channels commands!"});
    
let type = interaction.options.getString("value")

let dm_msg = interaction.options.getString("message")

let help_embed = new EmbedBuilder()
.setColor("#0014a8")
.setTitle("/setjoindm Help !")
.setDescription('/setjoindm <on/off/ls> <Message if the first args is on>')

if (type === "on") {
if(!dm_msg) return interaction.reply({embeds: [help_embed]})
try{
   if(!dm_msg) return interaction.reply({content: "You must specify a valid message for you join dm."})
    await db.set(`${interaction.guild.id}.GUILD.GUILD_CONFIG.joindm`, dm_msg);
    return interaction.reply({content: "You have successfully set the join dm to :```"+dm_msg+"``` And enable it "});

}catch(e){
   interaction.reply({content: "Error: missing permissions or channel doesn't exist"});
}
   try{
    logEmbed = new EmbedBuilder()
    .setColor("#bf0bb9") 
    .setTitle("SetJoinDm Logs")
    .setDescription(`<@${interaction.user.id}> set the join dm message !`)

            let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
            if(logchannel) { logchannel.send({embeds: [logEmbed]}) }
            }catch(e) { console.error(e) };
}

if (type === "off") {
   try{
       let already_off = await db.get(`joindm-${interaction.guild.id}`)
       if(already_off === "off") return interaction.reply("The join dm message is already disable !")
       await db.delete(`${interaction.guild.id}.GUILD.GUILD_CONFIG.joindm`);
       return interaction.reply({content: "You have successfully disable the join dm !"});
  
   }catch(e){
      //console.log(e)
      interaction.reply({content: "Error: missing permissions or channel doesn't exist"});
   }
   try{
       let ban_embed = new EmbedBuilder()
                .setColor("#bf0bb9") 
                .setTitle("SetJoinDm Logs")
               .setDescription(`<@${message.author.id}> disable the join dm message !`)
       let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
       logchannel.send({embeds: [ban_embed]})
       }catch(e){
           return;
       }  
}
if (type === "ls") {
   let already_off = await db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.joindm`)
   if (already_off === null) {
       return interaction.reply({content: "They are no join dm setup here !"})
   }
  return interaction.reply({content: "The join dm message is: \n```"+already_off+"```"})
}else{
interaction.reply({embeds: [help_embed]})
}
  
      const filter = (interaction) => interaction.user.id === interaction.member.id;
      }}
      