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
        name: 'disablexp',
        description: 'Disable the message when user earn new xp level message',
            options: [
                {
                    name: 'action',
                    type: ApplicationCommandOptionType.String,
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
                if(!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply(":x: | You must be an administrator of this server to request this commands!");
                let types = interaction.options.get("action").value
                           
                if (types == "off") {
                       try{
                        logEmbed = new EmbedBuilder()
                        .setColor("#bf0bb9") 
                        .setTitle("Disablexp Logs")
                        .setDescription(`<@${interaction.user.id}> disable xp !`)

                                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                                if(logchannel) { logchannel.send({embeds: [logEmbed]}) }
                                }catch(e) { console.error(e) };
                                await db.set(`${interaction.guild.id}.GUILD.XP_LEVELING.on_or_off`, "off");
                    return interaction.reply("You have successfully disable the leveling message (XP)");
               }else{
                if (types == "on") {
                            try{
                                logEmbed = new EmbedBuilder()
                                .setColor("#bf0bb9") 
                                .setTitle("Disablexp Logs")
                                .setDescription(`<@${interaction.user.id}> enable xp !`)
                                
                                        let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                                        if(logchannel) { logchannel.send({embeds: [logEmbed]}) }
                                        }catch(e) { console.error(e) };
                            await db.set(`${interaction.guild.id}.GUILD.XP_LEVELING.on_or_off`, "on");
                         return interaction.reply("You have successfully enable the leveling message (XP)");
                        
                            }
               }
                
          //const initialMessage = await interaction.reply({ embeds: [embed] });
      
          const filter = (interaction) => interaction.user.id === interaction.member.id;
          }}




