const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
const db = require("quick.db")

module.exports = {
        name: 'disableticket',
        description: 'Disable ticket category on a guild',
        options: [
                {
                    name: 'action',
                    type: "STRING",
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
      

                if(!interaction.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) return interaction.reply(":x: | You must be an administrator of this server to request this commands!");
    
                let type = interaction.options.getString('action')
      
               
                if(!type) return interaction.reply({content: "mmmh wtf?"})
               
                if (type === "off") {
                       try{
                        logEmbed = new MessageEmbed()
                        .setColor("PURPLE")
                        .setTitle("DisableTicket Logs")
                        .setDescription(`<@${interaction.user.id}> disable ticket commands !`);
                        
                                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                                if(logchannel) { logchannel.send({embeds: [logEmbed]}) }
                                }catch(e) { console.error(e) };
                        db.set(`ticket_oro_${interaction.guild.id}`, true);
                    return interaction.reply("You have successfully disable the ticket commands !");
               }
                if (type === "on") {
                       try{
                        logEmbed = new MessageEmbed()
                        .setColor("PURPLE")
                        .setTitle("Disablexp Logs")
                        .setDescription(`<@${interaction.user.id}> enable ticket commands !`)

                                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                                if(logchannel) { logchannel.send({embeds: [logEmbed]}) }
                                }catch(e) { console.error(e) };                       
                        db.delete(`ticket_oro_${interaction.guild.id}`);
                    return interaction.reply("You have successfully enable the ticket commands !");
                   
                       }      
          const filter = (interaction) => interaction.user.id === interaction.member.id;
          }}
