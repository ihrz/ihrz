const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');;
const db = require("quick.db")

module.exports = {
  name: 'setleavemessage',
  description: 'Set a leave message when user leave the server',
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
      description: `{user} = Username of Member | {membercount} = guild's member count | {guild} = The name of the guild`,
      required: false
  },
],
  run: async (client, interaction) => {
    if(!interaction.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) return interaction.reply(":x: | You must be an administrator of this server to request a welcome channels commands!");
let type = interaction.options.getString("value")
let messagei = interaction.options.getString("message")

let help_embed = new MessageEmbed()
.setColor("BLUE")
.setTitle("/setleavemessage Help !")
.setDescription('/setleavemessage <Power on /Power off/Show the message set> <leave message>')
.addField('how to use ?',
  `Use \`\`\`/setleavemessage <Power on /Power off/Show the message set> <message>\`\`\`
  {user} = Username of Member
  {membercount} = guild's member count
  {guild} = The name of the guild`)
  
  if(type == "on"){
    if(messagei){
      let joinmsgreplace = messagei
      .replace("{user}", "{user}")
      .replace("{guild}", "{guild}")
      .replace("{membercount}", "{membercount}")
      db.set(`leavemessage_${interaction.guild.id}`, joinmsgreplace)
  
  try{
    let ban_embed = new MessageEmbed()
    .setColor("PURPLE")
    .setTitle("SetJoinMessage Logs")
    .setDescription(`<@${interaction.user.id}> set the leave message !`)
  let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
  logchannel.send({embeds: [ban_embed]})
  }catch(e){console.error(e)}
  
      return interaction.reply(`✅ | Succefully set custom leave message.`)
    }

  }else{
    if(type == "off"){
      db.delete(`leavemessage_${interaction.guild.id}`);
      try{
        let ban_embed = new MessageEmbed()
        .setColor("PURPLE")
        .setTitle("SetJoinMessage Logs")
        .setDescription(`<@${interaction.user.id}> deleted the leave message !`)
      let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
      logchannel.send({embeds: [ban_embed]})
      }catch(e){console.error(e)}
      return interaction.reply(`✅ | Succefully deleted custom leave message.`)
    }
  }
  if(type == "ls"){
    var ls = db.fetch(`leavemessage_${interaction.guild.id}`);
    return interaction.reply("The leave message is: \n```"+ls+"```")
  }
  if(!type){
        return interaction.reply({embeds: [help_embed]})
  }
  if(!messagei){
    return interaction.reply({embeds: [help_embed]})
  }

    const filter = (interaction) => interaction.user.id === interaction.member.id;
    }}
