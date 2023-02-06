const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = {
        name: 'disablexp',
        description: 'Disable the message when user earn new xp level message',
            options: [
                {
                    name: 'action',
                    type: "STRING",
                    description: 'What you want to do?',
                    required: true,
                    choices: [
                {
                    name: "Remove the module (don't send any message but user still earn xp level)",
                    value: "off"
                },
                {
                    name: 'Power on the module (send message when user earn xp level)',
                    value: "on"
                },
            ],
        },
],
        run: async (client, interaction) => {
                if(!interaction.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) return interaction.reply(":x: | You must be an administrator of this server to request this commands!");
                let types = interaction.options.get("action").value
                           
                if (types == "off") {
                       try{
                        logEmbed = new MessageEmbed()
                        .setColor("PURPLE")
                        .setTitle("Disablexp Logs")
                        .setDescription(`<@${interaction.user.id}> disable xp !`)

                                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                                if(logchannel) { logchannel.send({embeds: [logEmbed]}) }
                                }catch(e) { console.error(e) };
                       db.set(`xp_oro_${interaction.guild.id}`, "off");
                    return interaction.reply("You have successfully disable the leveling message (XP)");
               }else{
                if (types == "on") {
                            try{
                                logEmbed = new MessageEmbed()
                                .setColor("PURPLE")
                                .setTitle("Disablexp Logs")
                                .setDescription(`<@${interaction.user.id}> enable xp !`)
                                
                                        let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                                        if(logchannel) { logchannel.send({embeds: [logEmbed]}) }
                                        }catch(e) { console.error(e) };
                            db.set(`xp_oro_${interaction.guild.id}`, "on");
                         return interaction.reply("You have successfully enable the leveling message (XP)");
                        
                            }
               }
                
          //const initialMessage = await interaction.reply({ embeds: [embed] });
      
          const filter = (interaction) => interaction.user.id === interaction.member.id;
          }}




