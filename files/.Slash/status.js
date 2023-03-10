const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
var os = require('os-utils');

module.exports = {
    name: 'status',
    description: 'Only for developers !',
    run: async (client, interaction) => {
  
        const config = require("../config.json")
        if(interaction.user.id != config.ownerid) return interaction.reply(":x: | **You have to be the bot developer to do this!**")
    os.cpuUsage(function(c){
    
        const embed = new MessageEmbed()
            .setColor("#42ff08")
            .addField("=====================", '**Consumed in real time** :')
            .addField("**CPU USAGE:**", 'CPU Usage (%): **' + c + '** %' )
            .addField("**MEMORY USAGE:**", 'MEMORY Usage (%): **' + os.freememPercentage() + '** %' )
            .addField("=====================", '**Characteristic of the machine** :')
            .addField("**TOTAL MEMORY:**", 'TOTAL MEMORY (MB): **' + os.totalmem() + '** MB')
            .addField("**PROCESSEUR TYPE:**", '**AMD RYZEN 7 5800X 8 CORE / 12 THREADS 4Ghz**')
            .addField("=====================", '`iHORIZON`')
            .setFooter('Status bot', `https://cdn.discordapp.com/avatars/751402041359990885/5f6f6f7f1934ffeec54d050de4c3084d.png?size=512`)
        return interaction.reply({embeds: [embed]});  
    })
    const filter = (interaction) => interaction.user.id === interaction.member.id;
}}