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
    name: 'setmembercount',
    description: 'Set a member count channel',
    options: [
      {
        name: "action",
        description: "<Power on /Power off>",
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
        ]
    },
    {
        name: "channel",
        description: `The channel to set the member count`,
        type: ApplicationCommandOptionType.Channel,
        required: true,
    },
    {
        name: 'name',
        required: false,
        type: ApplicationCommandOptionType.String,
        description: `{botcount}, {rolescount}, {membercount}`
    },
  ],
    run: async (client, interaction) => {
  
      
  if(!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply(":x: | You must be an administrator of this server to request a welcome channels commands!");
  let type = interaction.options.getString("action")
  let messagei = interaction.options.getString("name")
  let channel = interaction.options.getChannel("channel")

  let help_embed = new EmbedBuilder()
  .setColor("#0014a8")
  .setTitle("setmembercount Help !")
  .setDescription('/setmembercount <Power on /Power off> <Name of the channel>')
  .addFields({name:'how to use ?', value:
    `Use \`\`\`/setjoinmessage <Power on /Power off/Show the message set> <message>\`\`\`
    {membercount} = guild's member count
    {rolescount} = amount of roles
    {botcount} = guild's bot count
`})
    
    if(type == "on"){
        const botMembers = interaction.guild.members.cache.filter(member => member.user.bot);
        const rolesCollection = interaction.guild.roles.cache;
        const rolesCount = rolesCollection.size;
        
      if(messagei){
        let joinmsgreplace = messagei
        .replace("{rolescount}", rolesCount)
        .replace("{membercount}", interaction.guild.memberCount)
        .replace("{botcount}", botMembers.size)

        if (messagei.includes("member")) {
            await db.set(`${interaction.guild.id}.GUILD.MCOUNT.member`, {name: messagei, enable: true, event: "member", channel: channel.id})
        }else if (messagei.includes("roles")) {
            await db.set(`${interaction.guild.id}.GUILD.MCOUNT.roles`, {name: messagei, enable: true, event: "roles", channel: channel.id})
        }else if (messagei.includes("bot")) {
            await db.set(`${interaction.guild.id}.GUILD.MCOUNT.bot`, {name: messagei, enable: true, event: "bot", channel: channel.id})
        }
  //------------------------------
    try{ logEmbed = new EmbedBuilder()
      .setColor("#bf0bb9") 
      .setTitle("SetMemberCount Logs")
      .setDescription(`<@${interaction.user.id}> set the MemberCount of <#${channel.id}> to \`${messagei}\`!`)
  
              let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
              if(logchannel) { logchannel.send({embeds: [logEmbed]}) }
              }catch(e) { console.error(e) };
  //------------------------------
  const fetched = interaction.guild.channels.cache.get(channel.id);
        
        fetched.edit({ name: `${joinmsgreplace}` });
        return interaction.reply(`✅ | Succefully set MemberCount.`)
  
      }
    }else{
      if(type == "off"){
            await db.delete(`${interaction.guild.id}.GUILD.MCOUNT.member`)
            await db.delete(`${interaction.guild.id}.GUILD.MCOUNT.roles`)
            await db.delete(`${interaction.guild.id}.GUILD.MCOUNT.bot`)
          //------------------------------
    try{ logEmbed = new EmbedBuilder()
        .setColor("#bf0bb9") 
        .setTitle("SetMemberCount Logs")
        .setDescription(`<@${interaction.user.id}> remove the MemberCount of this guild !`)
    
                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                if(logchannel) { logchannel.send({embeds: [logEmbed]}) }
                }catch(e) { console.error(e) };
    //------------------------------
    return interaction.reply(`✅ | Succefully removed MemberCount.`)

      }
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
  