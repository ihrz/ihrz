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
  name: 'setleavemessage',
  description: 'Set a leave message when user leave the server',
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
      description: `{user} = Username of Member | {membercount} = guild's member count | {guild} = The name of the guild`,
      required: false
  },
],
  run: async (client, interaction) => {
    if(!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply(":x: | You must be an administrator of this server to request a welcome channels commands!");
let type = interaction.options.getString("value")
let messagei = interaction.options.getString("message")

let help_embed = new EmbedBuilder()
.setColor("#016c9a")
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
      await db.set(`${interaction.guild.id}.GUILD.GUILD_CONFIG.leavemessage`, joinmsgreplace)

  try{
    logEmbed = new EmbedBuilder()
    .setColor("#bf0bb9") 
    .setTitle("SetJoinMessage Logs")
    .setDescription(`<@${interaction.user.id}> set the leave message !`)

            let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
            if(logchannel) { logchannel.send({embeds: [logEmbed]}) }
            }catch(e) { console.error(e) };
  
      return interaction.reply(`✅ | Succefully set custom leave message.`)
    }

  }else{
    if(type == "off"){
      await db.delete(`${interaction.guild.id}.GUILD.GUILD_CONFIG.leavemessage`);
      try{
        let ban_embed = new EmbedBuilder()
        .setColor("#bf0bb9") 
        .setTitle("SetJoinMessage Logs")
        .setDescription(`<@${interaction.user.id}> deleted the leave message !`)
      let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
      logchannel.send({embeds: [ban_embed]})
      }catch(e){console.error(e)}
      return interaction.reply(`✅ | Succefully deleted custom leave message.`)
    }
  }
  if(type == "ls"){
    var ls = await db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.leavemessage`);
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
