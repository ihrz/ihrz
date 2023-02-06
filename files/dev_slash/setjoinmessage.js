const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');;
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = {
  name: 'setjoinmessage',
  description: 'Set a join message when user join the server',
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
      description: `{user}:username| {membercount}:guild member count| {createdat}:user create date| {guild}:Guild name`
  },
  
],
  run: async (client, interaction) => {

    
if(!interaction.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) return interaction.reply(":x: | You must be an administrator of this server to request a welcome channels commands!");
let type = interaction.options.getString("value")
let messagei = interaction.options.getString("message")

let help_embed = new MessageEmbed()
.setColor("BLUE")
.setTitle("setjoinmessage Help !")
.setDescription('/setjoinmessage <Power on /Power off/Show the message set> <join message>')
.addField('how to use ?',
  `Use \`\`\`/setjoinmessage <Power on /Power off/Show the message set> <message>\`\`\`
  {user} = Username of Member
  {membercount} = guild's member count
  {createdat} = member account creation date
  {guild} = The name of the guild`)
  
  if(type == "on"){
    if(messagei){
      let joinmsgreplace = messagei
      .replace("{user}", "{user}")
      .replace("{guild}", "{guild}")
      .replace("{createdat}", "{createdat}")
      .replace("{membercount}", "{membercount}")
      db.set(`joinmessage_${interaction.guild.id}`, joinmsgreplace)
  try{
    logEmbed = new MessageEmbed()
    .setColor("PURPLE")
    .setTitle("SetJoinMessage Logs")
    .setDescription(`<@${interaction.user.id}> set the join message !`)

            let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
            if(logchannel) { logchannel.send({embeds: [logEmbed]}) }
            }catch(e) { console.error(e) };

      return interaction.reply(`✅ | Succefully set custom join message.`)

    }
  }else{
    if(type == "off"){
      db.delete(`joinmessage_${interaction.guild.id}`);
      try{
        logEmbed = new MessageEmbed()
        .setColor("PURPLE")
        .setTitle("SetJoinMessage Logs")
        .setDescription(`<@${interaction.user.id}> deleted the join message !`)

                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                if(logchannel) { logchannel.send({embeds: [logEmbed]}) }
                }catch(e) { console.error(e) };


      return interaction.reply(`✅ | Succefully deleted custom join message.`)
    }
  }
  if(type == "ls"){
    var ls = await db.get(`joinmessage_${interaction.guild.id}`);
    return interaction.reply("The join message is: \n```"+ls+"```")
  }
  if(!type){
        return interaction.reply({embeds: [help_embed]})
  }
  if(!messagei){
    return interaction.reply({embeds: [help_embed]})
  }

  if(!type == "ls" || "on" || "off"){
    return interaction.reply({embeds: [help_embed]})
  }
    const filter = (interaction) => interaction.user.id === interaction.member.id;
    }}
