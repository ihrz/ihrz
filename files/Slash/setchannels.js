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
    name: 'setchannels',
    description: 'Set a message channels for when a user join and leave',
    options: [
        {
            name: 'type',
            type: ApplicationCommandOptionType.String,
            description: '<On join/On leave/Delete all settings>',
            required: true,
            choices: [
                {
                    name: "On join",
                    value: "join"
                },
                {
                    name: "On leave",
                    value: "leave"
                },
                {
                  name: "Delete all settings",
                  value: "off"
              },
              {
                  name: "Need help",
                  value: "needhelp"
              }
            ]
        },
        {
            name: 'channel',
            type: ApplicationCommandOptionType.Channel,
            description: '<channels id if the first args is "join" or "leave">',
            required: false
        }
    ],
    run: async (client, interaction) => {
        if(!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({content: ":x: | You must be an administrator of this server to request a welcome channels commands!"});
    
        let type = interaction.options.getString("type")
        let argsid = interaction.options.getChannel("channel")
        let help_embed = new EmbedBuilder()
        .setColor("#016c9a")
        .setTitle("/setchannels Help !")
        .setDescription('/setchannels <On join/On leave/Delete all settings> <channels id if the first args is "join" or "leave">')
       
        if(!type) return interaction.reply({embeds: [help_embed]})
       
       
        if (type === "join") {
            if(!argsid) return interaction.reply({content: "You must specify a valid channels id for you channels."})
               try{
                logEmbed = new EmbedBuilder()
                .setColor("#bf0bb9") 
                .setTitle("SetChannels Logs")
                .setDescription(`<@${interaction.user.id}> set the join channels to: <#${argsid.id}>`)

                        let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                        if(logchannel) { logchannel.send({embeds: [logEmbed]}) }
                        }catch(e) { console.error(e) };
        try{
           let already = await db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.join`)
               if(already === argsid.id) return interaction.reply({content: 'The join channels is already config with this channels id!'})
            client.channels.cache.get(argsid.id).send({content: "**Join channel set here!** :tada:"})
            await db.set(`${interaction.guild.id}.GUILD.GUILD_CONFIG.join`, argsid.id);
        
            return interaction.reply({content: "You have successfully set the join channel to <#"+argsid.id+">"});
       
        }catch(e){
            interaction.reply({content: "Error: missing permissions or channel doesn't exist"});
        }
        
        
       }
        
       if (type === "leave") {
       
        if(!argsid) return interaction.reply(help_embed)
           try{
       
               if(!argsid) return interaction.reply({content: "You must specify a valid channels id for you channels."})
               let already = await db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.leave`)
               if(already === argsid.id) return interaction.reply({content: 'The leave channels is already config with this channels id!'})
               client.channels.cache.get(argsid.id).send({content: "**Leaves channel set here!** :tada:"})
               await db.set(`${interaction.guild.id}.GUILD.GUILD_CONFIG.leave`, argsid.id);
           
               return interaction.reply({content: "You have successfully set the leaves channel to <#"+argsid.id+">"});
          
           }catch(e){
              interaction.reply({content: "Error: missing permissions or channel doesn't exist"});
           }
           try{
            logEmbed = new EmbedBuilder()
            .setColor("#bf0bb9") 
            .setTitle("SetChannels Logs")
            .setDescription(`<@${interaction.user.id}> set the leaves channels to: <#${argsid.id}>`)
            
                    let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                    if(logchannel) { logchannel.send({embeds: [logEmbed]}) }
                    }catch(e) { console.error(e) };

               
          }
        if (type === "off") {
              try{
               let leavec = await db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.join`)
               let joinc = await db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.leave`)
               if(joinc === "off" & leavec === "off") return interaction.reply({content: 'The join & leave channels is already disable'})
       
               await db.delete(`${interaction.guild.id}.GUILD.GUILD_CONFIG.join`);
               await db.delete(`${interaction.guild.id}.GUILD.GUILD_CONFIG.leave`);
               return interaction.reply({content: "You have successfully disable the leaves & join channel !"});
          
              }catch{
       
              }

              try{
                logEmbed = new EmbedBuilder()
                .setColor("#bf0bb9") 
                .setTitle("SetChannels Logs")
                .setDescription(`<@${interaction.user.id}> delete all join/leave message channels configurations !`)
                
                        let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                        if(logchannel) { logchannel.send({embeds: [logEmbed]}) }
                        }catch(e) { console.error(e) };
          }else{
            return interaction.reply({embeds: [help_embed]});
          }
       
       
  
      const filter = (interaction) => interaction.user.id === interaction.member.id;
      }}