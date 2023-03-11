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
        name: 'disableticket',
        description: 'Disable ticket category on a guild',
        options: [
                {
                    name: 'action',
                    type: ApplicationCommandOptionType.String,
                    description: 'What you want to do?',
                    required: true,
                    choices: [
                {
                    name: "Remove the module",
                    value: "off"
                },
                {
                    name: 'Power on the module',
                    value: "on"
                },
            ],
        },
        ],
        run: async (client, interaction) => {
      

                if(!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply(":x: | You must be an administrator of this server to request this commands!");
    
                let type = interaction.options.getString('action')
      
               
                if(!type) return interaction.reply({content: "mmmh wtf?"})
               
                if (type === "off") {
                       try{
                        logEmbed = new EmbedBuilder()
                        .setColor("#bf0bb9")
                        .setTitle("DisableTicket Logs")
                        .setDescription(`<@${interaction.user.id}> disable ticket commands !`);
                        
                                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                                if(logchannel) { logchannel.send({embeds: [logEmbed]}) }
                                }catch(e) { console.error(e) };
                        await db.set(`${interaction.guild.id}.GUILD.TICKET.on_or_off`, "off");
                    return interaction.reply("You have successfully disable the ticket commands !");
               }
                if (type === "on") {
                       try{
                        logEmbed = new EmbedBuilder()
                        .setColor("#bf0bb9")
                        .setTitle("Disablexp Logs")
                        .setDescription(`<@${interaction.user.id}> enable ticket commands !`)

                                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                                if(logchannel) { logchannel.send({embeds: [logEmbed]}) }
                                }catch(e) { console.error(e) };                       
                        await db.delete(`${interaction.guild.id}.GUILD.TICKET.on_or_off`);
                    return interaction.reply("You have successfully enable the ticket commands !");
                   
                       }      
          const filter = (interaction) => interaction.user.id === interaction.member.id;
          }}
