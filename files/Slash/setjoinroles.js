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
    name: 'setjoinroles',
    description: 'Set a roles to new user',
    options: [
        {
            name: "value",
            description: "<Power on /Power off/Show the message set>",
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                {
                    name: "Power on",
                    value: "true"
                },
                {
                    name: "Power off",
                    value: "false"
                },
                {
                  name: "Show the roles set",
                  value: "ls"
              },
              {
                name: "Need help",
                value: "needhelp"
            }
            ]
        },
        {
            name: 'roles',
            type: ApplicationCommandOptionType.Role,
            description: '<roles id>',
            required: false
        }
    ],
    run: async (client, interaction) => {
        if(!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply(":x: | You must be an administrator of this server to request a welcome channels commands!");
    
        let query = interaction.options.getString("value")
        var roleid = interaction.options.get("roles").value
        let help_embed = new EmbedBuilder()
        .setColor("#016c9a")
        .setTitle("/setjoinroles Help !")
        .setDescription('/setjoinroles <Power on /Power off/Show the message set> <role id>')
        
        if(query === "true"){
            if(!roleid) return interaction.reply(help_embed);
try{
                    logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9") 
                    .setTitle("SetJoinRoles Logs")
                    .setDescription(`<@${interaction.user.id}> set the join roles !`)

                            let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                            if(logchannel) { logchannel.send({embeds: [logEmbed]}) }
                            }catch(e) { console.error(e) };

            try{
                let already = await db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.joinroles`);
                if(already === roleid) return interaction.reply("The join roles is already config with this role !")
                await db.set(`${interaction.guild.id}.GUILD.GUILD_CONFIG.joinroles`, roleid);
        
                return interaction.reply("You have successfully set the join roles to <@&"+roleid+"> !");
           
            }catch(e){
                console.log(e)
               return interaction.reply("Error: missing permissions or role doesn't exist");
            }
        }else{
            if(query === "false"){
                try{
                    let ban_embed = new EmbedBuilder()
                    .setColor("#bf0bb9") 
                    .setTitle("SetJoinRoles Logs")
                    .setDescription(`<@${interaction.user.id}> delete the join roles !`)
                    let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                    logchannel.send({embeds: [ban_embed]})
                    }catch(e){
                        
                    }  
            
                try{
                    let already = await db.delete(`${interaction.guild.id}.GUILD.GUILD_CONFIG.joinroles`);
                    if(!already) return interaction.reply("You don't have a join roles configured, is useless !")
            
                    return interaction.reply("You have successfully delete the join roles !");
               
                }catch(e){
                    console.log(e)
                   return interaction.reply("error?");
                }
            }else{
                if(query === "ls"){
                    let roles = await db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.joinroles`)
                    if(!roles) return interaction.reply("This guild don't have a join roles set.")
                    return interaction.reply(`The join roles set is <@&${roles}>`)
                 }else{
                    interaction.reply(help_embed)
                 }
            }
        }
  
      const filter = (interaction) => interaction.user.id === interaction.member.id;
      }}
      